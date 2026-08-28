/**
 * kill-ports.js
 * Cross-platform port killer — ONLY kills BuonApp processes.
 * Uses an allowlist approach: identifies BuonApp by process name/cmdline,
 * then kills only those processes that hold the target ports.
 *
 * Usage: node kill-ports.js 3001 3002 3003
 */
const { execSync, exec } = require('child_process');
const os = require('os');
const path = require('path');

// ── Validate args ───────────────────────────────────────────────────────────
const ports = process.argv.slice(2)
  .map((p) => parseInt(p, 10))
  .filter((p) => Number.isInteger(p) && p >= 1 && p <= 65535);

if (ports.length === 0 && require.main === module) {
  console.log('[kill-ports] No valid ports specified. Usage: node kill-ports.js 3001 3002 3003');
  process.exit(0);
}

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// ── Identity: how to recognize a BuonApp process ────────────────────────
// These patterns match the process command line on all platforms.
// In dev: `electron .` with app.name = 'buonapp'
// Packaged:
//   - Linux: executableName "buonapp" (snap/AppImage/deb binary path)
//   - Mac/Windows: productName "BuonApp"
const BUONAPP_PATTERNS = [
  /(?:^|[\s\\/])buonapp(?:\.exe)?(?:$|\s)/i,
  /(?:^|[\s\\/])BuonApp\.app(?:[\\/]Contents[\\/]MacOS[\\/]BuonApp)?(?:$|\s)/i,
  /(?:^|\s)it\.buonapp\.pos(?:\.\S*)?(?:$|\s)/i,
  /(?:^|\s)electron(?:\s+\S+)*\s+--appName=buonapp(?:$|\s)/i,
  /(?:^|\s)(?:node|nodejs)(?:\s+\S+)*[\\/]BuonApp[\\/](?:dev-server\.js|dist[\\/]index\.js)(?:$|\s)/i,
  /(?:^|\s)(?:node|nodejs)(?:\s+\S+)*\s+dev-server\.js(?:$|\s)/i,
  // Pre-rename Flo Cafe process names: a leftover old build can still be holding
  // the port during the transition, so keep clearing those too.
  /(?:^|[\s\\/])Flo[\s_\-]*Cafe(?:\.exe)?(?:$|\s)/i,
  /(?:^|\s)com\.flo\.desktop(?:\.\S*)?(?:$|\s)/i,
  /(?:^|\s)flo[_\-]?pos(?:-service)?(?:\.exe)?(?:$|\s)/i,
  /(?:^|\s)electron(?:\s+\S+)*\s+--appName=flo[_\-]?desktop(?:$|\s)/i,
];

function isBuonAppProcess(cmdline) {
  if (!cmdline) return false;
  return BUONAPP_PATTERNS.some((pat) => pat.test(cmdline));
}

function isValidPid(pid) {
  return typeof pid === 'string' && /^\d+$/.test(pid) && Number(pid) > 0;
}

// ── Identity: a leftover dev instance of THIS checkout ──────────────────────
// A dev instance that has already released its ports still owns the Electron
// single-instance lock, and the next `electron .` then quits on the spot. Port
// scanning cannot see it, so match it by the Electron binary it was launched
// from: that path is unique to this working copy, which keeps the installed
// app and every other project out of range.

function normalizeProcessPath(value) {
  return String(value).replace(/\\/g, '/').toLowerCase();
}

function isProjectDevInstance(cmdline, projectRoot) {
  if (!cmdline) return false;
  const normalized = normalizeProcessPath(cmdline);
  const electronDir = normalizeProcessPath(path.join(projectRoot, 'node_modules', 'electron'));
  if (!normalized.includes(electronDir)) return false;
  // Only the main process. Its renderer, GPU, and network helpers carry
  // --type= and go down with it, so naming them here would just be noise.
  if (/\s--type=/.test(normalized)) return false;
  // The test harness drives the same binary; `npm run dev` must not shoot down
  // a suite that is halfway through a run.
  return !normalized.includes(normalizeProcessPath(path.join(projectRoot, 'tests')));
}

// ── Find processes on a port (cross-platform) ───────────────────────────────
// Returns Array<{ pid: string, cmdline: string }>
function getProcessesOnPort(port) {
  const results = [];

  if (isWindows) {
    try {
      // netstat gives PIDs listening on the port
      const out = execSync(
        `netstat -aon | findstr "LISTENING" | findstr ":${port} "`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const pids = new Set();
      for (const line of out.split('\n')) {
        const m = line.trim().match(/(\d+)\s*$/);
        if (m) pids.add(m[1]);
      }
      for (const pid of pids) {
        if (!isValidPid(pid)) continue;
        let cmdline = '';
        try {
          const cmdOut = execSync(
            `wmic process where "ProcessId=${pid}" get CommandLine / value 2>nul`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          );
          const m = cmdOut.match(/CommandLine=(.*)/i);
          cmdline = m?.[1]?.trim() || '';
        } catch { /* WMIC is absent on newer Windows installations. */ }
        if (!cmdline) {
          try {
            cmdline = execSync(
              `powershell.exe -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine"`,
              { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 5000 }
            ).trim();
          } catch { /* process metadata is unavailable; fail closed below */ }
        }
        results.push({ pid, cmdline });
      }
    } catch { /* port is free */ }
    return results;
  }

  // Unix: lsof → ss → fuser fallback
  if (hasLsof) {
    try {
      // -F pC: output pid and command name fields
      const out = execSync(
        `lsof -i :${port} -P -n -F pC 2>/dev/null`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const pids = new Set();
      for (const line of out.split('\n')) {
        if (line.startsWith('p')) pids.add(line.slice(1));
      }
      for (const pid of pids) {
        if (!isValidPid(pid)) continue;
        const cmdline = getCmdline(pid);
        results.push({ pid, cmdline });
      }
      if (results.length > 0) return results;
    } catch { /* fall through */ }
  }

  if (hasSs) {
    try {
      const out = execSync(
        `ss -tlnp 'sport = :${port}' 2>/dev/null`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const pidMatches = [...out.matchAll(/pid=(\d+)/g)];
      for (const m of pidMatches) {
        const pid = m[1];
        if (!isValidPid(pid)) continue;
        const cmdline = getCmdline(pid);
        results.push({ pid, cmdline });
      }
      if (results.length > 0) return results;
    } catch { /* fall through */ }
  }

  if (hasFuser) {
    try {
      const out = execSync(
        `fuser ${port}/tcp 2>/dev/null`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      for (const pid of out.trim().split(/\s+/)) {
        if (!isValidPid(pid)) continue;
        const cmdline = getCmdline(pid);
        results.push({ pid, cmdline });
      }
    } catch { /* fall through */ }
  }

  return results;
}

// ── Read /proc/<pid>/cmdline (Linux) or ps (macOS) ──────────────────────────
function getCmdline(pid) {
  if (isLinux) {
    try {
      return execSync(
        `cat /proc/${pid}/cmdline 2>/dev/null | tr '\\0' ' '`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
    } catch { return ''; }
  }
  if (isMac) {
    try {
      return execSync(
        `ps -p ${pid} -o command= 2>/dev/null`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();
    } catch { return ''; }
  }
  return '';
}

// ── Detect available tools on Unix ──────────────────────────────────────────
function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

const hasLsof = !isWindows && hasCommand('lsof');
const hasSs = !isWindows && hasCommand('ss');
const hasFuser = !isWindows && hasCommand('fuser');

// ── Graceful kill: SIGTERM → wait → SIGKILL ─────────────────────────────────
function gracefulKill(pid) {
  return new Promise((resolve) => {
    if (!isValidPid(pid)) return resolve(false);
    // Try SIGTERM first
    exec(`kill ${pid} 2>/dev/null`, { shell: '/bin/sh' }, () => {
      // Wait 2 seconds for graceful shutdown
      setTimeout(() => {
        // Check if still alive
        exec(`kill -0 ${pid} 2>/dev/null`, { shell: '/bin/sh' }, (err) => {
          if (!err) {
            // Still alive — escalate to SIGKILL
            exec(`kill -9 ${pid} 2>/dev/null`, { shell: '/bin/sh' }, (killError) => {
              if (killError) return resolve(false);
              exec(`kill -0 ${pid} 2>/dev/null`, { shell: '/bin/sh' }, (stillAlive) => resolve(Boolean(stillAlive)));
            });
          } else {
            resolve(true);
          }
        });
      }, 2000);
    });
  });
}

function gracefulKillWindows(pid) {
  return new Promise((resolve) => {
    if (!isValidPid(pid)) return resolve(false);
    // taskkill without /F sends WM_CLOSE (graceful)
    exec(`taskkill /PID ${pid} 2>nul`, { shell: 'cmd.exe' }, () => {
      setTimeout(() => {
        exec(`tasklist /FI "PID eq ${pid}" /NH`, { shell: 'cmd.exe' }, (checkError, stdout) => {
          if (checkError || !new RegExp(`\\b${pid}\\b`).test(stdout)) return resolve(true);
          exec(`taskkill /F /PID ${pid} 2>nul`, { shell: 'cmd.exe' }, (killError) => {
            if (killError) return resolve(false);
            // Windows takes a moment to retire the process entry, and checking
            // straight away reported a successful kill as a failure.
            setTimeout(() => {
              exec(`tasklist /FI "PID eq ${pid}" /NH`, { shell: 'cmd.exe' }, (afterError, afterStdout) => {
                resolve(Boolean(afterError) || !new RegExp(`\\b${pid}\\b`).test(afterStdout));
              });
            }, 500);
          });
        });
      }, 2000);
    });
  });
}

// ── Kill a port ─────────────────────────────────────────────────────────────
async function killPort(port) {
  const procs = getProcessesOnPort(port);

  if (procs.length === 0) {
    console.log(`[kill-ports] Port ${port} is free.`);
    return;
  }

  // A dev run shows up as this checkout's bare Electron binary, which none of
  // the name patterns above describe: the port scan used to report the app it
  // was written to stop as somebody else's process and leave it running.
  const isOwnProcess = (p) => isBuonAppProcess(p.cmdline) || isProjectDevInstance(p.cmdline, __dirname);
  const buonAppProcs = procs.filter(isOwnProcess);
  const otherProcs = procs.filter((p) => !isOwnProcess(p));

  // Report what we found but won't touch
  for (const p of otherProcs) {
    const cmd = p.cmdline || 'unknown process';
    console.log(
      `[kill-ports] Port ${port}: SKIP — PID ${p.pid} (${cmd}) is not a BuonApp process.`
    );
  }

  if (buonAppProcs.length === 0) {
    console.log(
      `[kill-ports] Port ${port}: no BuonApp processes found. ${procs.length} other process(es) using this port.`
    );
    return;
  }

  // Kill BuonApp processes
  for (const p of buonAppProcs) {
    const cmd = p.cmdline || 'electron';
    console.log(`[kill-ports] Port ${port}: killing BuonApp process PID ${p.pid} (${cmd})...`);
    const stopped = isWindows
      ? await gracefulKillWindows(p.pid)
      : await gracefulKill(p.pid);
    if (stopped) {
      console.log(`[kill-ports] Port ${port}: PID ${p.pid} stopped.`);
    } else {
      console.warn(`[kill-ports] Port ${port}: could not stop PID ${p.pid}.`);
    }
  }
}

// ── List running processes (cross-platform) ─────────────────────────────────
// Returns Array<{ pid: string, cmdline: string }>; an empty list when the
// platform refuses to enumerate, so a failure here never kills anything.
function listProcesses() {
  const results = [];
  const separator = '|~|';

  try {
    const out = isWindows
      ? execSync(
        'powershell.exe -NoProfile -NonInteractive -Command '
        + `"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'electron.exe' -or $_.Name -eq 'node.exe' } `
        + `| ForEach-Object { $_.ProcessId.ToString() + '${separator}' + $_.CommandLine }"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 15000 }
      )
      : execSync('ps -eo pid=,args=', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 15000 });

    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [pid, cmdline] = isWindows
        ? trimmed.split(separator)
        : [trimmed.slice(0, trimmed.indexOf(' ')), trimmed.slice(trimmed.indexOf(' ') + 1)];
      if (!isValidPid(pid) || !cmdline) continue;
      results.push({ pid, cmdline: cmdline.trim() });
    }
  } catch { /* enumeration is unavailable; fail closed with an empty list */ }

  return results;
}

// ── Stop leftover dev instances of this checkout ────────────────────────────
async function killStaleDevInstances(projectRoot = __dirname) {
  const stale = listProcesses().filter(
    (p) => p.pid !== String(process.pid) && isProjectDevInstance(p.cmdline, projectRoot)
  );

  if (stale.length === 0) {
    console.log('[kill-ports] No leftover BuonApp dev instance found.');
    return;
  }

  for (const p of stale) {
    console.log(`[kill-ports] Stopping leftover dev instance PID ${p.pid} (${p.cmdline.slice(0, 120)})...`);
    const stopped = isWindows
      ? await gracefulKillWindows(p.pid)
      : await gracefulKill(p.pid);
    if (stopped) {
      console.log(`[kill-ports] PID ${p.pid} stopped.`);
    } else {
      console.warn(`[kill-ports] Could not stop PID ${p.pid}.`);
    }
  }
}

// ── Main / Export ───────────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    for (const port of ports) {
      await killPort(port);
    }
    // Ports come first: an instance that is still serving is the common case,
    // and this sweep then catches the one that kept only the instance lock.
    await killStaleDevInstances();
  })();
} else {
  module.exports = {
    isBuonAppProcess,
    BUONAPP_PATTERNS,
    getProcessesOnPort,
    killPort,
    isProjectDevInstance,
    listProcesses,
    killStaleDevInstances,
  };
}
