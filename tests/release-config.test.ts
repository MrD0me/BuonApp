/**
 * Release integrity checks — catches the class of bug where macOS
 * auto-update silently 404'd on latest-mac.yml for every release from
 * v1.6.7 through v1.9.11: electron-builder needs a `zip` mac target to
 * produce that manifest, and the release workflow has to actually upload
 * it (and the Windows/NSIS equivalent, latest.yml) alongside the installer.
 * None of this requires an actual platform build — it's a config/workflow
 * shape check, fast enough to run on every `npm test`.
 */
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

function run() {
  console.log('Testing release config + workflow integrity...');

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const build = pkg.build;

  assert.equal(pkg.engines?.node, '>=22.12.0', 'root Node engine must match Electron 43 minimum');
  assert.equal(pkg.scripts?.['verify:electron'], 'node scripts/verify-electron-runtime.cjs', 'Electron runtime verification must be cross-platform');
  assert.ok(fs.existsSync(path.join(__dirname, '../scripts/verify-electron-runtime.cjs')), 'cross-platform Electron runtime verifier must exist');

  // ── electron-builder config ──────────────────────────────────────────
  assert.ok(build?.publish?.provider === 'github', 'build.publish must target GitHub releases');

  const macTargets = (build?.mac?.target || []).map((t: any) => t.target);
  assert.ok(
    macTargets.includes('zip'),
    'mac build target must include "zip" — DMG alone cannot be used for electron-updater\'s ' +
    'silent background updates, and without a zip target electron-builder never produces latest-mac.yml'
  );

  const winTargets = (build?.win?.target || []).map((t: any) => t.target);
  assert.ok(
    winTargets.includes('nsis'),
    'win build target must include "nsis" — electron-updater\'s Windows auto-update relies on ' +
    'the NSIS installer + latest.yml'
  );
  assert.equal(
    pkg.scripts?.['build:appx'],
    'npm run build:frontend && npm run build && electron-builder --win appx --x64 --arm64 --config.npmRebuild=false',
    'build:appx must remain available for local x64+arm64 Microsoft Store package builds without requiring a native rebuild'
  );
  assert.ok(build?.appx?.identityName, 'build.appx.identityName must be set for Microsoft Store package identity');
  assert.ok(build?.appx?.publisher, 'build.appx.publisher must be set for Microsoft Store package identity');

  const appxTarget = winTargets.find((target: string) => target === 'appx');
  assert.ok(appxTarget, 'win build target must include "appx" for Microsoft Store packages');
  const winTargetConfigs = (build?.win?.target || []) as Array<{ target: string; arch?: string[] }>;
  const appxConfig = winTargetConfigs.find((target) => target.target === 'appx');
  assert.ok(
    appxConfig?.arch?.includes('arm64'),
    'win appx target must include arm64 so Windows on Arm Store users get a native package'
  );

  // ── Linux snap: Path B (snapcraft, core24) shape ────────────────
  assert.ok(
    build?.snapcraft?.base === 'core24',
    'build.snapcraft.base must be "core24" — modern Electron (≥28) is supported, GNOME extension ' +
    'requires core22+. Old "snap" block is legacy and can\'t declare the GNOME extension cleanly.'
  );
  const snapsPlugs = (build?.snapcraft?.core24?.plugs || []) as string[];
  assert.ok(
    snapsPlugs.includes('default'),
    'plugs must include "default" so electron-builder\'s Electron base plug set (x11, wayland, ' +
    'home, network, audio-playback, opengl, ...) is preserved instead of replaced'
  );
  assert.ok(
    snapsPlugs.includes('network-bind'),
    'plugs must include "network-bind" — the local Express server binds 0.0.0.0:3001 and the ' +
    'KDS server binds 0.0.0.0:3002; without this both fail under strict confinement'
  );
  const linuxEnv = build?.snapcraft?.core24?.environment || {};
  assert.ok(
    linuxEnv.TMPDIR === '$XDG_RUNTIME_DIR',
    'snapcraft.core24.environment.TMPDIR must be "$XDG_RUNTIME_DIR" — Chromium/Electron needs a ' +
    'writable runtime tmpdir or libappindicator resources become unreadable under confinement'
  );
  const linuxSynopsis = build?.linux?.synopsis;
  assert.ok(
    typeof linuxSynopsis === 'string' && linuxSynopsis.length > 0 && linuxSynopsis.length <= 78,
    `linux.synopsis must be set and ≤78 chars (got ${JSON.stringify(linuxSynopsis)})`
  );

  // ── Linux AppImage: AppImageHub catalog compatibility ────────────
  // The AppImageHub catalog auto-discovers AppImages whose filename
  // matches <AppName>-<Version>-<arch>.AppImage. The productName
  // ("BuonApp") default would produce "BuonApp-2.0.4-x86_64.AppImage"
  // (space + capital letter) which the catalog regex won't match.
  const linuxArtifact = build?.linux?.artifactName;
  assert.ok(
    typeof linuxArtifact === 'string' && linuxArtifact.includes('${arch}') && !/\s/.test(linuxArtifact.replace(/\$\{[^}]+\}/g, '')),
    `linux.artifactName must be a single lowercased template using \${arch} (got ${JSON.stringify(linuxArtifact)})`
  );

  const linuxTargets = (build?.linux?.target || []) as Array<{ target: string; arch?: string[] }>;
  // arm64 must be declared on EVERY Linux target — AppImage, deb, rpm, snap.
  // otherwise the arm64 matrix runner would skip that target and the release
  // would only ship half-arch.
  const expectedArchPerTarget: Array<[string, string]> = [
    ['AppImage', 'AppImagehub auto-discovery + ARM Linux desktops'],
    ['deb', 'Debian / Ubuntu / Raspberry Pi OS / SteamOS'],
    ['rpm', 'Fedora / RHEL / Nobara / openSUSE on arm64'],
    ['snap', 'Snap Store on Raspberry Pi + ARM servers'],
  ];
  for (const [targetName, why] of expectedArchPerTarget) {
    const target = linuxTargets.find((t) => t.target === targetName);
    assert.ok(
      target,
      `linux.target must include "${targetName}" (${why})`
    );
    assert.ok(
      target.arch && target.arch.includes('arm64'),
      `${targetName} target.arch must include "arm64" (${why})`
    );
  }

  // AppStream metainfo file must be wired into the AppImage at the
  // freedesktop-spec path usr/share/metainfo/. AppImageHub's catalog
  // CI runs appstreamcli validate against this file.
  const extraFiles: any[] = build?.linux?.extraFiles || [];
  const metainfoEntry = extraFiles.find(
    (f) => typeof f?.to === 'string' && f.to.startsWith('usr/share/metainfo/')
  );
  assert.ok(
    metainfoEntry,
    'linux.extraFiles must include an entry that copies the AppStream metainfo to usr/share/metainfo/'
  );
  assert.ok(
    fs.existsSync(path.join(__dirname, '..', metainfoEntry!.from)),
    `metainfo source file must exist on disk: ${metainfoEntry!.from}`
  );
  // The release job must invoke scripts/update-metainfo.js before the
  // build so each AppImage ships with a fresh <release> entry. A stale
  // 1.7.1 entry has shipped in every release since 2.x.
  assert.ok(
    fs.existsSync(path.join(__dirname, '../scripts/update-metainfo.js')),
    'scripts/update-metainfo.js must exist — it is invoked by the release job to keep ' +
    'assets/it.buonapp.pos.metainfo.xml current.'
  );
  const metainfoUpdater = fs.readFileSync(path.join(__dirname, '../scripts/update-metainfo.js'), 'utf8');
  assert.ok(
    /replace\(\/\(\\s\*<releases\\b\[\^>\]\*\>\)/.test(metainfoUpdater),
    'metadata updater must insert into attributed and bare <releases> elements'
  );

  // ── release workflow uploads the auto-update manifests, not just installers ──
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/release.yml'), 'utf8');

  // issue #220: `on.push.tags: '[0-9]*'` is a glob, not a version pattern —
  // it matches any tag starting with a digit. Every downstream step reads
  // VERSION from package.json rather than the pushed tag, so without an
  // explicit check a malformed or mismatched tag would silently create a
  // release titled after whatever package.json says under an unrelated ref.
  const createReleaseJob = workflow.split(/^\s*create-release:/m)[1]?.split(/^\s*release-windows:/m)[0] || '';
  assert.ok(
    /\[\[\s*"\$TAG"\s*=~\s*\^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$\s*\]\]/.test(createReleaseJob),
    'create-release job must validate the pushed tag against a strict X.Y.Z pattern before creating a release'
  );
  assert.ok(
    /"\$TAG"\s*!=\s*"\$VERSION"/.test(createReleaseJob),
    'create-release job must reject a tag that does not equal package.json\'s version'
  );

  const winJob = workflow.split(/^\s*release-windows:/m)[1] || '';
  assert.ok(winJob.includes('latest.yml'), 'release-windows job must upload latest.yml');
  assert.ok(winJob.includes('.exe.blockmap'), 'release-windows job must upload the .exe.blockmap');
  assert.ok(
    /electron-builder --win nsis --publish never --config\.npmRebuild=false/.test(winJob),
    'release-windows job must build the NSIS target — it is the only Windows artifact electron-updater can apply'
  );

  // This fork has no Apple Developer, Snap Store, or Partner Center account.
  // Every job that reached one of them failed closed by design when its
  // credentials were missing, which took the whole release down with it and
  // left nothing for electron-updater to pull from. Keep them out.
  assert.ok(
    !/release-mac:|release-linux:/.test(workflow),
    'release.yml must not reintroduce the macOS or Linux jobs — neither can be signed or published from this fork'
  );
  for (const forbidden of [
    'microsoft-store-apppublisher',
    'msstore',
    'SNAPCRAFT_STORE_CREDENTIALS',
    'APPLE_API_KEY',
  ]) {
    assert.ok(
      !workflow.includes(forbidden),
      `release.yml must not reference ${forbidden} — store publishing and code signing were removed with the fork`
    );
  }

  const macArtifact = build?.mac?.artifactName;
  assert.ok(
    typeof macArtifact === 'string' && macArtifact.includes('${arch}') && macArtifact.includes('mac') && !/\s/.test(macArtifact.replace(/\$\{[^}]+\}/g, '')),
    `mac.artifactName must be a single lowercased template using \${arch} and mac identifier (got ${JSON.stringify(macArtifact)})`
  );

  const winArtifact = build?.win?.artifactName;
  assert.ok(
    typeof winArtifact === 'string' && winArtifact.includes('${arch}') && winArtifact.includes('win') && !/\s/.test(winArtifact.replace(/\$\{[^}]+\}/g, '')),
    `win.artifactName must be a single lowercased template using \${arch} and win identifier (got ${JSON.stringify(winArtifact)})`
  );

  // ── nightly matrix workflow integrity ──
  const matrixWorkflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/nightly-release.yml'), 'utf8');

  assert.ok(
    matrixWorkflow.includes('workflow_dispatch:'),
    'Full Cross-Platform Matrix workflow must be startable from the Actions tab'
  );
  assert.ok(
    !/^\s*(pull_request|schedule|push)\s*:/m.test(matrixWorkflow),
    'Full Cross-Platform Matrix workflow must stay manual-only — a four-platform build on every ' +
    'push to main, plus a nightly cron, spends runner minutes on artifacts nobody collects'
  );
  assert.ok(
    matrixWorkflow.includes('cancel-in-progress: false'),
    'Full Cross-Platform Matrix workflow must not cancel in-progress builds on main'
  );
  assert.ok(
    matrixWorkflow.includes('name: build-${{ matrix.name }}'),
    'build-matrix job name should be parameterized by matrix.name'
  );

  for (const targetName of ['linux-x64', 'macos-arm64', 'macos-x64', 'windows-x64']) {
    assert.ok(
      matrixWorkflow.includes(`name: ${targetName}`),
      `build-matrix strategy must include ${targetName} target`
    );
  }

  assert.ok(
    matrixWorkflow.includes('name: buonapp-build-${{ matrix.name }}'),
    'Full Cross-Platform Matrix workflow must upload build artifacts with descriptive platform-arch names'
  );

  const ciWorkflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8');
  assert.ok(
    ciWorkflow.includes('run: npm run test:release-regressions') &&
    ciWorkflow.includes("REQUIRE_VISUAL_EVIDENCE: '1'") &&
    ciWorkflow.includes('EVIDENCE_DIR: ${{ runner.temp }}/buonapp-release-regressions'),
    'CI must run release regression suites with required visual evidence in a portable runner temp directory',
  );
  assert.ok(
    ciWorkflow.includes('name: release-regression-evidence') &&
    ciWorkflow.includes('path: ${{ runner.temp }}/buonapp-release-regressions/'),
    'CI must upload release regression evidence artifacts when available',
  );

  console.log('✅ Release config + workflow integrity checks passed');
}

run();
