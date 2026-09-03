import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { getDatabase, getSettingValue, parseDbTimestamp } from '../db';
import { PrinterCutMode, resolvePrinterProfile, matchSupportedPrinterProfile, SupportedPrinterProfile } from './profiles';
import { getCountryByCode } from '../countries';
import { correlationId, type FloErrorCode } from '../errors';

export type PrintResult = {
  ok: boolean;
  code?: FloErrorCode;
  correlationId: string;
  stage: 'prepare' | 'dispatch';
  detail?: string;
  failureClass?: PrintFailureClass;
  platformErrorCode?: number;
  jobId?: number;
  driverName?: string;
  printerStatus?: number;
  warnings?: PrintWarning[];
};

export type PrintWarning = {
  field: string;
  text: string;
  message: string;
};

/** Low-level dispatch result — carries the actual OS/driver reason, not just ok/fail. */
export type DispatchResult = {
  ok: boolean;
  detail?: string;
  failureClass?: PrintFailureClass;
  platformErrorCode?: number;
  jobId?: number;
  driverName?: string;
  printerStatus?: number;
  warnings?: PrintWarning[];
};

export type PrintFailureClass =
  | 'not_configured'
  | 'offline'
  | 'queue_unavailable'
  | 'spooler_error'
  | 'driver_error'
  | 'permission_denied'
  | 'timeout'
  | 'write_error'
  | 'unsupported'
  | 'unknown';

/** Stable, privacy-safe classification for fleet telemetry. */
export function classifyPrintFailure(detail?: string): PrintFailureClass {
  const value = String(detail || '').toLowerCase();
  if (!value) return 'unknown';
  if (value.includes('no printer configured') || value.includes('no windows printer configured')) return 'not_configured';
  if (value.includes('offline') || value.includes('use printer offline') || value.includes('disconnected')) return 'offline';
  if (value.includes('not accepting') || value.includes('queue') && value.includes('unavailable') || value.includes('cannot open printer')) return 'queue_unavailable';
  if (value.includes('spool') || value.includes('startdocprinter') || value.includes('startpageprinter')) return 'spooler_error';
  if (value.includes('driver') || value.includes('no driver')) return 'driver_error';
  if (value.includes('access denied') || value.includes('permission')) return 'permission_denied';
  if (value.includes('timed out') || value.includes('timeout')) return 'timeout';
  if (value.includes('writeprinter') || value.includes('accepted') && value.includes('of')) return 'write_error';
  if (value.includes('not supported') || value.includes('unsupported')) return 'unsupported';
  return 'unknown';
}

function extractPlatformErrorCode(detail?: string): number | undefined {
  const match = String(detail || '').match(/\b(?:win32 error|error)\s+(\d+)\b/i);
  if (!match) return undefined;
  const code = Number(match[1]);
  return Number.isSafeInteger(code) ? code : undefined;
}

const isMasBuild =
  process.env.MAS_BUILD === '1' ||
  (process as NodeJS.Process & { mas?: boolean }).mas === true;
const PRINTER_DETECTION_TIMEOUT_MS = 10_000;

export type PrinterColumnWidth = 36 | 42 | 48;

export interface PrinterInfo {
  name: string;
  make: string;
  model: string;
  connectionType: 'usb' | 'network' | 'bluetooth';
  deviceUri: string;
  driver?: string;
  status: 'idle' | 'printing' | 'offline';
  isDefault: boolean;
  ipAddress?: string;
  port?: number;
  paperWidth?: string;
  profileId?: string;
}

function guessPaperWidth(name: string, model: string): string {
  const profile = matchSupportedPrinterProfile(name, model);
  if (profile) return profile.defaultPaperWidth;
  const s = (name + ' ' + model).toLowerCase();
  if (s.includes('58')) return 'cols-32';
  return 'cols-42';
}

function annotateProfile(info: Omit<PrinterInfo, 'profileId'>): PrinterInfo {
  const profile = matchSupportedPrinterProfile(info.name, info.make, info.model);
  return profile ? { ...info, profileId: profile.id, paperWidth: info.paperWidth || profile.defaultPaperWidth } : info;
}

function parseDeviceUri(uri: string): { ip?: string; port?: number } {
  const m = uri.match(/(?:socket|ipp|ipps|http|https|lpd):\/\/([^:\/\s]+)(?::(\d+))?/i);
  if (!m) return {};
  const host = m[1];
  const port = m[2] ? parseInt(m[2], 10) : undefined;
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  return { ip: isIp ? host : host, port };
}

export async function detectConnectedPrinters(signal?: AbortSignal): Promise<PrinterInfo[]> {
  const printers: PrinterInfo[] = [];

  if (isMasBuild || signal?.aborted) {
    return printers;
  }

  if (process.platform === 'darwin') {
    return await detectMacOSPrinters(signal);
  }

  if (process.platform === 'win32') {
    return detectWindowsPrinters(signal);
  }

  if (process.platform === 'linux') {
    return detectLinuxPrinters(signal);
  }

  return printers;
}

async function detectMacOSPrinters(signal?: AbortSignal): Promise<PrinterInfo[]> {
  const printers: PrinterInfo[] = [];

  try {
    const { stdout: lpStatOutput } = await execFileAsync('lpstat', ['-v'], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    const lines = lpStatOutput.split('\n');

    const printerNames = new Set<string>();

    for (const line of lines) {
      const match = line.match(/device for (\S+):\s*(.+)/);
      if (match) {
        if (signal?.aborted) return printers;
        const name = match[1];
        const uri = match[2].trim();

        if (!printerNames.has(name)) {
          printerNames.add(name);

          const makeModel = await getMacOSPrinterDetails(name, signal);
          const isDefault = await isMacOSDefaultPrinter(name, signal);
          const status = await getMacOSPrinterStatus(name, signal);
          if (signal?.aborted) return printers;
          const isNetwork = /^(socket|ipp|ipps|http|https|lpd):\/\//i.test(uri);
          const { ip, port } = isNetwork ? parseDeviceUri(uri) : {};

          printers.push(annotateProfile({
            name,
            make: makeModel.make,
            model: makeModel.model,
            connectionType: isNetwork ? 'network' : 'usb',
            deviceUri: uri,
            status,
            isDefault,
            ipAddress: ip,
            port: port || (isNetwork ? 9100 : undefined),
            paperWidth: guessPaperWidth(name, makeModel.model),
          }));
        }
      }
    }
  } catch (err) {
    console.log('[Printer] Could not detect macOS printers:', err);
  }

  return printers;
}

async function getMacOSPrinterStatus(name: string, signal?: AbortSignal): Promise<'idle' | 'printing' | 'offline'> {
  try {
    const { stdout } = await execFileAsync('lpstat', ['-p', name], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    const out = stdout.toLowerCase();
    if (out.includes('disabled')) return 'offline';
    if (out.includes('printing') || out.includes('now printing')) return 'printing';
    return 'idle';
  } catch {
    return 'offline';
  }
}

async function getMacOSPrinterDetails(name: string, signal?: AbortSignal): Promise<{ make: string; model: string }> {
  let make = 'Unknown';
  let model = 'Thermal Printer';

  try {
    const { stdout: info } = await execFileAsync('lpoptions', ['-p', name, '-l'], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });

    const lower = info.toLowerCase();

    if (lower.includes('epson') || name.toLowerCase().includes('tm-')) {
      make = 'Epson';
      model = extractEpsonModel(name, info);
    } else if (lower.includes('xprinter') || name.toLowerCase().includes('xprinter')) {
      make = 'Xprinter';
      model = name.includes('80') ? 'Xprinter 80mm' : 'Xprinter 58mm';
    } else if (lower.includes('star') || name.toLowerCase().includes('tsp')) {
      make = 'Star';
      model = 'TSP Thermal';
    } else if (lower.includes('zjiang') || name.toLowerCase().includes('zj')) {
      make = 'Zjiang';
      model = '58mm Thermal';
    } else if (lower.includes('zebra')) {
      make = 'Zebra';
      model = 'Zebra Thermal';
    } else if (lower.includes('brother')) {
      make = 'Brother';
      model = 'Brother Thermal';
    } else if (lower.includes('canon')) {
      make = 'Canon';
      model = 'Canon Printer';
    } else if (lower.includes('hp') || lower.includes('hewlett')) {
      make = 'HP';
      model = 'HP Printer';
    } else {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('58') || nameLower.includes('thermal')) {
        make = 'Generic';
        model = '58mm Thermal Printer';
      } else if (nameLower.includes('80')) {
        make = 'Generic';
        model = '80mm Thermal Printer';
      }
    }
  } catch {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('epson') || nameLower.includes('tm-')) {
      make = 'Epson';
      model = 'TM Series';
    } else if (nameLower.includes('xprinter')) {
      make = 'Xprinter';
      model = nameLower.includes('80') ? 'Xprinter 80mm' : 'Xprinter 58mm';
    }
  }

  return { make, model };
}

function extractEpsonModel(name: string, info: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('tm-m30')) return 'TM-m30';
  if (lower.includes('tm-t88')) return 'TM-T88';
  if (lower.includes('tm-t82')) return 'TM-T82';
  if (lower.includes('tm-t20')) return 'TM-T20';
  if (lower.includes('tm-t60')) return 'TM-T60';
  if (lower.includes('tm-l90')) return 'TM-L90';
  if (lower.includes('tm-h600')) return 'TM-H600';
  if (lower.includes('tm-u')) return 'TM-U Series';
  if (lower.includes('tm-')) return 'TM Series';
  return 'Epson Thermal';
}

async function isMacOSDefaultPrinter(name: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const { stdout: defaultPrinter } = await execFileAsync('lpstat', ['-d'], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    return defaultPrinter.includes(name);
  } catch {
    return false;
  }
}

// wmic.exe was removed from Windows 11 24H2+, so it can no longer be relied
// on to enumerate printers. Get-CimInstance talks to the same WMI class
// (Win32_Printer) through the still-supported CIM cmdlets, and -EncodedCommand
// (rather than a .ps1) survives a GPO-locked ExecutionPolicy the same way the
// raw-print helper below does.
const DETECT_WINDOWS_PRINTERS_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Get-CimInstance -ClassName Win32_Printer -Property Name,Default,PrinterStatus,DriverName |
    Select-Object Name,Default,PrinterStatus,DriverName |
    ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

// Win32_Printer.PrinterStatus: 1=Other, 2=Unknown, 3=Idle, 4=Printing, 5=Warming Up, 6=Stopped Printing, 7=Offline.
function mapWindowsPrinterStatus(printerStatus: unknown): 'idle' | 'printing' | 'offline' {
  if (printerStatus === 3 || printerStatus === 5) return 'idle';
  if (printerStatus === 4) return 'printing';
  return 'offline';
}

async function detectWindowsPrinters(signal?: AbortSignal): Promise<PrinterInfo[]> {
  const printers: PrinterInfo[] = [];

  try {
    const encoded = Buffer.from(DETECT_WINDOWS_PRINTERS_SCRIPT, 'utf16le').toString('base64');
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { encoding: 'utf8', timeout: PRINTER_DETECTION_TIMEOUT_MS, signal, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    );

    const trimmed = stdout.trim();
    if (trimmed && trimmed !== 'null') {
      const parsed = JSON.parse(trimmed);
      const entries = Array.isArray(parsed) ? parsed : [parsed];

      for (const entry of entries) {
        const name = typeof entry?.Name === 'string' ? entry.Name.trim() : '';
        if (!name) continue;

        const driver = typeof entry.DriverName === 'string' ? entry.DriverName : '';
        const makeModel = detectWindowsMakeModel(name, driver);

        printers.push(annotateProfile({
          name,
          make: makeModel.make,
          model: makeModel.model,
          connectionType: 'usb',
          deviceUri: name,
          driver,
          status: mapWindowsPrinterStatus(entry.PrinterStatus),
          isDefault: entry.Default === true,
          paperWidth: guessPaperWidth(name, makeModel.model),
        }));
      }
    }
  } catch (err) {
    console.log('[Printer] Could not detect Windows printers via Get-CimInstance:', err);
  }

  return printers;
}

function detectWindowsMakeModel(name: string, driver: string): { make: string; model: string } {
  let make = 'Unknown';
  let model = 'Thermal Printer';

  const lower = (name + ' ' + driver).toLowerCase();

  if (lower.includes('epson') || name.toLowerCase().includes('tm-')) {
    make = 'Epson';
    model = name.includes('TM-m30') ? 'TM-m30' :
            name.includes('TM-T88') ? 'TM-T88' :
            name.includes('TM-T82') ? 'TM-T82' :
            name.includes('TM-T20') ? 'TM-T20' : 'TM Series';
  } else if (lower.includes('xprinter')) {
    make = 'Xprinter';
    model = lower.includes('80') ? 'Xprinter 80mm' : 'Xprinter 58mm';
  } else if (lower.includes('star') || lower.includes('tsp')) {
    make = 'Star';
    model = 'TSP Thermal';
  } else if (lower.includes('zjiang')) {
    make = 'Zjiang';
    model = '58mm Thermal';
  } else if (lower.includes('zebra')) {
    make = 'Zebra';
    model = 'Zebra Thermal';
  } else if (lower.includes('brother')) {
    make = 'Brother';
    model = 'Brother Thermal';
  } else if (lower.includes('58') || lower.includes('thermal')) {
    make = 'Generic';
    model = '58mm Thermal';
  } else if (lower.includes('80')) {
    make = 'Generic';
    model = '80mm Thermal';
  }

  return { make, model };
}

// USB vendor ID lookup for common thermal printer brands
const THERMAL_PRINTER_VENDORS: Record<string, string> = {
  '04b8': 'Epson',
  '0456': 'Xprinter',
  '0519': 'Star Micronics',
  '0525': 'Star Micronics',
  '0416': 'Zjiang',
  '0419': 'Bixolon',
  '1d90': 'Citizen',
  '04f9': 'Brother',
};

// Bridge chip vendor IDs (not printer brands — these identify the USB-to-serial chip)
const BRIDGE_CHIP_VENDORS = new Set(['1a86', '10c4', '0403']);

function parseCupsDeviceUri(uri: string): { make: string; model: string } | null {
  // USB URIs look like: usb://Epson/TM-T88V?serial=ABC123
  const usbMatch = uri.match(/usb:\/\/([^/?]+)\/([^?]+)/);
  if (usbMatch) {
    return { make: decodeURIComponent(usbMatch[1]), model: decodeURIComponent(usbMatch[2]) };
  }
  // Network URIs look like: socket://192.168.1.100:9100
  return null;
}

async function getMakeModelFromLpstat(signal?: AbortSignal): Promise<Map<string, { make: string; model: string }>> {
  const result = new Map<string, { make: string; model: string }>();
  try {
    const { stdout: output } = await execFileAsync('lpstat', ['-l', '-p'], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    let currentName = '';
    for (const line of output.split('\n')) {
      const nameMatch = line.match(/^printer (\S+) is/);
      if (nameMatch) currentName = nameMatch[1];
      const uriMatch = line.match(/Device URI:\s*(.+)/);
      if (uriMatch && currentName) {
        const parsed = parseCupsDeviceUri(uriMatch[1].trim());
        if (parsed) result.set(currentName, parsed);
      }
    }
  } catch { /* CUPS not available */ }
  return result;
}

function getUsbPrinterVendorIds(): Map<string, { vendorId: string; manufacturer: string | null; product: string | null }> {
  const result = new Map<string, { vendorId: string; manufacturer: string | null; product: string | null }>();
  const devicesDir = '/sys/bus/usb/devices';
  try {
    const entries = fs.readdirSync(devicesDir);
    for (const entry of entries) {
      if (entry.includes(':')) continue; // skip interfaces
      const devPath = `${devicesDir}/${entry}`;
      try {
        const devClass = fs.readFileSync(`${devPath}/bDeviceClass`, 'utf8').trim();
        if (devClass !== '07') continue; // 07 = USB printer class
        const vendorId = fs.readFileSync(`${devPath}/idVendor`, 'utf8').trim();
        const manufacturer = readSysfsSafe(`${devPath}/manufacturer`);
        const product = readSysfsSafe(`${devPath}/product`);
        result.set(entry, { vendorId, manufacturer, product });
      } catch { /* skip device */ }
    }
  } catch { /* sysfs not available */ }
  return result;
}

function readSysfsSafe(filePath: string): string | null {
  try { return fs.readFileSync(filePath, 'utf8').trim(); }
  catch { return null; }
}

async function detectLinuxPrinters(signal?: AbortSignal): Promise<PrinterInfo[]> {
  const printers: PrinterInfo[] = [];

  try {
    // Layer 1: Get make/model from CUPS Device URI (most reliable)
    const cupsMakeModel = await getMakeModelFromLpstat(signal);
    if (signal?.aborted) return printers;

    // Layer 2: Get USB vendor IDs from sysfs (works without CUPS)
    const usbVendors = getUsbPrinterVendorIds();

    // Get printer list from CUPS
    const { stdout: output } = await execFileAsync('lpstat', ['-v'], {
      encoding: 'utf8',
      timeout: PRINTER_DETECTION_TIMEOUT_MS,
      signal,
      maxBuffer: 10 * 1024 * 1024,
    });
    const lines = output.split('\n');

    for (const line of lines) {
      if (signal?.aborted) return printers;
      const match = line.match(/device for (\S+):\s*(.+)/);
      if (match) {
        const name = match[1];
        const uri = match[2].trim();
        const isNetwork = /^(socket|ipp|ipps|http|https|lpd):\/\//i.test(uri);
        const { ip, port } = isNetwork ? parseDeviceUri(uri) : {};

        // Try CUPS Device URI first, then fall back to Generic
        const cupsInfo = cupsMakeModel.get(name);
        let make = cupsInfo?.make || 'Generic';
        let model = cupsInfo?.model || 'Thermal Printer';

        // For USB printers without CUPS info, try sysfs vendor ID lookup
        if (!cupsInfo && !isNetwork) {
          for (const [, vendorInfo] of usbVendors) {
            // Skip bridge chips — they identify the serial adapter, not the printer
            if (BRIDGE_CHIP_VENDORS.has(vendorInfo.vendorId.toLowerCase())) {
              // But if sysfs has manufacturer/product strings, use those
              if (vendorInfo.manufacturer && vendorInfo.product) {
                make = vendorInfo.manufacturer;
                model = vendorInfo.product;
              }
              continue;
            }
            const vendorMake = THERMAL_PRINTER_VENDORS[vendorInfo.vendorId.toLowerCase()];
            if (vendorMake) {
              make = vendorMake;
              model = vendorInfo.product || 'Thermal Printer';
              break;
            }
          }
        }

        printers.push(annotateProfile({
          name,
          make,
          model,
          connectionType: isNetwork ? 'network' : 'usb',
          deviceUri: uri,
          status: 'idle',
          isDefault: false,
          ipAddress: ip,
          port: port || (isNetwork ? 9100 : undefined),
          paperWidth: guessPaperWidth(name, model),
        }));
      }
    }
  } catch {
    console.log('[Printer] Could not detect Linux printers');
  }

  return printers;
}

export async function initPrinter(): Promise<void> {
  try {
    const db = getDatabase();
    const printer = db.prepare('SELECT * FROM printers WHERE is_default = 1').get() as any;
    if (printer) {
      console.log(`[Printer] Default printer: ${printer.name} (${printer.connection_type})`);
    } else {
      console.log('[Printer] No default printer configured');
    }
  } catch (error) {
    console.log('[Printer] Printer initialization skipped (database not ready)');
  }
}

export async function printReceipt(order: any, bill: any, business?: any, template: string = 'classic', useUnicode: boolean = false, isReprint: boolean = false, signal?: AbortSignal): Promise<DispatchResult> {
  try {
    if (signal?.aborted) return { ok: false, detail: 'Print cancelled during shutdown' };
    console.log('[Printer] printReceipt called, template:', template, 'useUnicode:', useUnicode, 'isReprint:', isReprint);
    const printer = getPrinterConfig();
    if (!printer) {
      console.log('[Printer] No printer configured');
      return { ok: false, detail: 'No printer configured' };
    }
    const { data, warnings, columns } = prepareReceipt(order, bill, business, template, useUnicode, isReprint);
    console.log('[Printer] Using printer:', printer.name, printer.connection_type, 'columns:', columns);
    console.log('[Printer] Receipt data length:', data.length, 'bytes');
    console.log('[Printer] First 100 bytes:', Array.from(data.slice(0, 100)).map(b => b.toString(16)).join(' '));

    const dispatch = await dispatchPrint(printer, data, signal);
    return warnings.length > 0 ? { ...dispatch, warnings } : dispatch;
  } catch (error: any) {
    console.error('[Printer] Print error:', error);
    return { ok: false, detail: error?.message };
  }
}

export async function printKOT(order: any, items: any[], stationName: string, useUnicode: boolean = false, targetPrinter?: any, signal?: AbortSignal, batch?: number, isReprint: boolean = false): Promise<DispatchResult> {
  try {
    if (signal?.aborted) return { ok: false, detail: 'Print cancelled during shutdown' };
    console.log('[Printer] printKOT called, items count:', items?.length || 0, 'useUnicode:', useUnicode, 'station:', stationName);
    const printer = targetPrinter || getPrinterConfig();
    if (!printer) {
      console.log('[Printer] No printer configured');
      return { ok: false, detail: 'No printer configured' };
    }
    console.log('[Printer] Using printer:', printer.name, printer.connection_type);

    const profile = resolvePrinterProfile(printer);
    const cols = getColumnsForPrinter(printer, profile);

    // `settings` is a key/value table, so the old `SELECT * FROM settings
    // LIMIT 1` returned one arbitrary row and left country/timezone undefined —
    // every kitchen ticket silently fell back to en-US and the machine clock.
    const country = getSettingValue('country');
    const timezone = getSettingValue('timezone');
    const locale = country ? getCountryByCode(country)?.locale ?? 'en-US' : 'en-US';
    const tzOptions = timezone ? { timeZone: timezone } : undefined;

    const warnings: PrintWarning[] = [];
    const language = getSettingValue('language') || 'en';
    const data = formatKOT(order, items, stationName, cols, useUnicode, profile.cutMode, locale, tzOptions, warnings, profile.arabicShaping ?? false, batch, language, isReprint, profile.codePage);
    console.log('[Printer] KOT data length:', data.length, 'bytes');
    const dispatch = await dispatchPrint(printer, data, signal);
    return warnings.length > 0 ? { ...dispatch, warnings } : dispatch;
  } catch (error: any) {
    console.error('[Printer] KOT print error:', error);
    return { ok: false, detail: error?.message };
  }
}

/**
 * Records a print failure in the local log. This used to go out on two
 * telemetry tiers — an anonymous event and a store-attributed diagnostic —
 * both of which left the building. The log is where the person standing next
 * to the printer can read it, and it stays best-effort: nothing here may
 * affect the caller's result or make checkout wait.
 */
function reportPrintFailure(kind: 'receipt' | 'kot', result: PrintResult): void {
  let connectionType = 'unknown';
  try {
    connectionType = getPrinterConfig()?.connection_type || 'unknown';
  } catch { /* best-effort only */ }

  const failureClass = result.failureClass || classifyPrintFailure(result.detail);
  console.error('[Printer] print failed', {
    kind,
    code: result.code,
    stage: result.stage,
    connection_type: connectionType,
    correlation_id: result.correlationId,
    failure_class: failureClass,
    detail: (result.detail || '').slice(0, 300),
    ...(result.platformErrorCode !== undefined ? { platform_error_code: result.platformErrorCode } : {}),
    ...(result.jobId !== undefined ? { job_id: result.jobId } : {}),
    ...(result.driverName ? { driver_name: result.driverName.slice(0, 160) } : {}),
    ...(result.printerStatus !== undefined ? { printer_status: result.printerStatus } : {}),
  });
}

/** Typed adapters used by API callers while legacy boolean callers migrate. */
export async function printReceiptDetailed(...args: Parameters<typeof printReceipt>): Promise<PrintResult> {
  const id = correlationId();
  try {
    const dispatch = await printReceipt(...args);
    const result: PrintResult = dispatch.ok
      ? { ok: true, correlationId: id, stage: 'dispatch', warnings: dispatch.warnings }
      : {
        ok: false,
        code: 'print.receipt.failed',
        correlationId: id,
        stage: 'dispatch',
        detail: dispatch.detail,
        failureClass: dispatch.failureClass || classifyPrintFailure(dispatch.detail),
        platformErrorCode: dispatch.platformErrorCode || extractPlatformErrorCode(dispatch.detail),
        jobId: dispatch.jobId,
        driverName: dispatch.driverName,
        printerStatus: dispatch.printerStatus,
        warnings: dispatch.warnings,
      };
    if (!result.ok) reportPrintFailure('receipt', result);
    return result;
  } catch (error) {
    const detail = (error as Error).message;
    const result: PrintResult = { ok: false, code: 'print.receipt.failed', correlationId: id, stage: 'dispatch', detail, failureClass: classifyPrintFailure(detail), platformErrorCode: extractPlatformErrorCode(detail) };
    reportPrintFailure('receipt', result);
    return result;
  }
}

export async function printKOTDetailed(...args: Parameters<typeof printKOT>): Promise<PrintResult> {
  const id = correlationId();
  try {
    const dispatch = await printKOT(...args);
    const result: PrintResult = dispatch.ok
      ? { ok: true, correlationId: id, stage: 'dispatch', warnings: dispatch.warnings }
      : {
        ok: false,
        code: 'print.kot.failed',
        correlationId: id,
        stage: 'dispatch',
        detail: dispatch.detail,
        failureClass: dispatch.failureClass || classifyPrintFailure(dispatch.detail),
        platformErrorCode: dispatch.platformErrorCode || extractPlatformErrorCode(dispatch.detail),
        jobId: dispatch.jobId,
        driverName: dispatch.driverName,
        printerStatus: dispatch.printerStatus,
        warnings: dispatch.warnings,
      };
    if (!result.ok) reportPrintFailure('kot', result);
    return result;
  } catch (error) {
    const detail = (error as Error).message;
    const result: PrintResult = { ok: false, code: 'print.kot.failed', correlationId: id, stage: 'dispatch', detail, failureClass: classifyPrintFailure(detail), platformErrorCode: extractPlatformErrorCode(detail) };
    reportPrintFailure('kot', result);
    return result;
  }
}

function getColumnsForPrinter(printer: any, profile: SupportedPrinterProfile): number {
  const paperWidth = printer.paper_width || profile.defaultPaperWidth || '80mm';
  const explicitColumns = columnsForPaperWidth(paperWidth);
  if (explicitColumns) return explicitColumns;
  return profile.fontAColumns || 48;
}

function columnsForPaperWidth(paperWidth: string): number | null {
  const colsMatch = String(paperWidth || '').match(/^cols-(3[2-9]|4[0-8])$/);
  if (colsMatch) return Number(colsMatch[1]);

  switch (paperWidth) {
    case '58mm':
      return 32;
    case '58mm-36':
      return 36;
    case '80mm-42':
      return 42;
    case '80mm':
      return null;
    default:
      return null;
  }
}

async function dispatchPrint(printer: any, data: Buffer, signal?: AbortSignal): Promise<DispatchResult> {
  switch (printer.connection_type) {
    case 'network':
      return await printViaNetwork(printer.ip_address, printer.port || 9100, data, signal);
    case 'usb':
      if (isMasBuild) {
        const detail = 'USB printers are not supported in the App Store build. Use a network printer.';
        console.log(`[Printer] ${detail}`);
        return { ok: false, detail };
      }
      return await printViaUSB(data, printer.name, signal);
    case 'webusb':
      console.log('[Printer] WebUSB printer — not supported in Electron');
      return { ok: false, detail: 'WebUSB printers are handled in the browser, not by the desktop app' };
    default:
      console.log(`[Printer] Unsupported connection type: ${printer.connection_type}`);
      return { ok: false, detail: `Unsupported connection type: ${printer.connection_type}` };
  }
}

function getPrinterConfig(): any {
  const db = getDatabase();
  return db.prepare(
    `SELECT * FROM printers
     WHERE connection_type != 'webusb'
     ORDER BY is_default DESC, name
     LIMIT 1`,
  ).get();
}

export function prepareReceipt(order: any, bill: any, business?: any, template: string = 'classic', useUnicode: boolean = false, isReprint: boolean = false): {
  printer: any;
  data: Buffer;
  warnings: PrintWarning[];
  columns: number;
} {
  let printer = getPrinterConfig();
  if (!printer) {
    printer = {
      id: 0,
      name: 'Default 80mm Preview',
      paper_width: '80mm',
    };
  }

  const profile = resolvePrinterProfile(printer);
  const columns = getColumnsForPrinter(printer, profile);
  const warnings: PrintWarning[] = [];
  const data = formatReceipt(order, bill, business, template, columns, useUnicode, isReprint, profile.cutMode, warnings, profile.arabicShaping ?? false, getPrintLanguage(), profile.codePage);
  return { printer, data, warnings, columns };
}

export function formatReceipt(order: any, bill: any, business?: any, template?: string, cols: number = 48, useUnicode: boolean = false, isReprint: boolean = false, cutMode: PrinterCutMode = 'full', warnings?: PrintWarning[], arabicShaping: boolean = false, language: string = 'en', codePage?: number): Buffer {
  console.log('[Printer] formatReceipt - template:', template);
  console.log('[Printer] formatReceipt - order:', order?.order_number, 'bill:', bill?.bill_number);
  console.log('[Printer] formatReceipt - items count:', order?.items?.length || 0, 'cols:', cols);

  const biz = business || { name: 'Store', address: '', phone: '', taxRegistrationNumber: '' };
  const tpl = normalizeReceiptTemplate(template);

  try {
    switch (tpl) {
      case 'classic':
        return formatClassicReceipt(order, bill, biz, cols, useUnicode, isReprint, cutMode, warnings, arabicShaping, language, codePage);
      default:
        return formatCompactReceipt(order, bill, biz, cols, useUnicode, isReprint, cutMode, warnings, arabicShaping, language, codePage);
    }
  } catch (err) {
    console.error('[Printer] formatReceipt error:', err);
    throw err;
  }
}

function normalizeReceiptTemplate(template?: string): 'classic' | 'compact' {
  const normalized = String(template || 'classic').toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('compact') || normalized.includes('minimal')) return 'compact';
  return 'classic';
}

function formatCompactReceipt(order: any, bill: any, biz: any, cols: number = 48, useUnicode: boolean = false, isReprint: boolean = false, cutMode: PrinterCutMode = 'full', warnings?: PrintWarning[], arabicShaping: boolean = false, language: string = 'en', codePage?: number): Buffer {
  const lines: string[] = [];
  const date = parseDbTimestamp(order.created_at);
  const L = receiptLabels(language);

  const bar = '='.repeat(cols);
  const dash = '-'.repeat(cols);

  const prefix = resolveCurrencyPrefix(biz.currency_symbol || '₹', useUnicode, codePage);
  const trimDecimals = biz.trim_decimals === true;
  const locale = getCountryByCode(biz.country)?.locale ?? 'en-US';
  const amtLen = itemAmountWidth(order, prefix, locale, trimDecimals, cols);
  const itemNameLen = itemNameWidth(cols, amtLen);
  const taxIdLabel = getCountryByCode(biz.country)?.taxIdLabel || 'Tax ID';

  const tzOptions = biz.timezone ? { timeZone: biz.timezone } : undefined;

  lines.push('{INIT}');
  if (isReprint) lines.push('{CENTER}{BOLD}{DOUBLE_HEIGHT}{DOUBLE_WIDTH}' + L.reprint + '{/DOUBLE_WIDTH}{/DOUBLE_HEIGHT}{/BOLD}{/CENTER}');
  if (biz.show_name !== false && biz.name) lines.push('{STORE_NAME}{CENTER}{BOLD}' + biz.name + '{/BOLD}{/CENTER}');
  lines.push(bar);
  lines.push(L.billNo + (bill.bill_number || order.order_number));
  lines.push(L.date + date.toLocaleDateString(locale + '-u-nu-latn', tzOptions) + ' ' + date.toLocaleTimeString(locale + '-u-nu-latn', tzOptions));
  if (biz.show_table_number !== false && order.table?.name) lines.push(L.table + order.table.name);
  if (biz.show_customer_name !== false && biz.customer_name) lines.push(L.customer + biz.customer_name);
  if (biz.show_customer_phone !== false && biz.customer_phone) lines.push(L.customerPhone + biz.customer_phone);
  lines.push(dash);
  lines.push(itemHeader(itemNameLen, amtLen, L));
  lines.push(dash);

  if (order.items) {
    for (const item of order.items) {
      lines.push(...itemRows(item, itemNameLen, amtLen, cols, prefix, locale, trimDecimals, L.offered));

      const addons = parseAddons(item.addons);
      for (const addon of addons) {
        lines.push(...addonRows(addon, itemNameLen, amtLen, cols, prefix, locale, trimDecimals));
      }
      if (item.special_instructions) {
        lines.push('  ' + L.note + truncate(item.special_instructions, cols - L.note.length - 2));
      }
    }
  }

  lines.push(dash);
  lines.push(...financialRows(L.subtotal, formatCurrency(bill.subtotal, prefix, locale, trimDecimals), cols));
  if (bill.discount_amount > 0) {
    lines.push(...financialRows(L.discount, '-' + formatCurrency(bill.discount_amount, prefix, locale, trimDecimals), cols));
  }
  // So much a head. Printed only when there is one, and it says the arithmetic
  // out loud — "Coperto 4 x 2,00" — because a guest who is charged for the
  // table being laid is owed the reason.
  if (Number(bill.cover_charge) > 0) {
    const heads = Number(order?.guest_count || 0);
    // Only spell out "4 x 2,00" when it multiplies back to the amount printed
    // beside it, as the guest at the table will check it. It will not once a
    // fixed menu carries the cover for part of the table.
    const perHead = heads > 0 ? Number((Number(bill.cover_charge) / heads).toFixed(2)) : 0;
    const divides = heads > 0 && Math.abs(perHead * heads - Number(bill.cover_charge)) < 0.005;
    const coverLabel = divides
      ? `${L.cover} ${heads} x ${formatCurrency(perHead, prefix, locale, trimDecimals)}`
      : L.cover;
    lines.push(...financialRows(coverLabel, formatCurrency(bill.cover_charge, prefix, locale, trimDecimals), cols));
  }
  lines.push(...financialRows(L.total, formatCurrency(bill.total, prefix, locale, trimDecimals), cols).map((line) => `{BOLD}${line}{/BOLD}`));

  if (bill.payment_details) {
    lines.push(dash);
    try {
      const payments = typeof bill.payment_details === 'string' ? JSON.parse(bill.payment_details) : bill.payment_details;
      if (payments && Array.isArray(payments)) {
        for (const payment of payments) {
          if (payment && payment.method) {
            const methodLabel = truncate(capitalize(String(payment.method)), cols - 12);
            lines.push(...financialRows(methodLabel, formatCurrency(payment.amount, prefix, locale, trimDecimals), cols));
          }
        }
      }
    } catch (err: any) {
      console.warn('[Printer] Failed to parse payment details JSON:', err.message);
    }
  }

  lines.push(bar);
  if (biz.show_address !== false && biz.address) pushWrapped(lines, biz.address, cols);
  if (biz.show_phone !== false && biz.phone) pushWrapped(lines, L.phone + biz.phone, cols);
  if (biz.show_tax_id === true && biz.taxRegistrationNumber) pushWrapped(lines, taxIdLabel + ': ' + biz.taxRegistrationNumber, cols);
  if (biz.footer_note) pushCenteredWrapped(lines, biz.footer_note, cols);
  else lines.push('{CENTER}' + L.thankYou + '{/CENTER}');
  lines.push('{CUT}');

  return buildEscPos(lines, useUnicode, { cutMode, arabicShaping, codePage }, warnings);
}

function formatClassicReceipt(order: any, bill: any, biz: any, cols: number = 48, useUnicode: boolean = false, isReprint: boolean = false, cutMode: PrinterCutMode = 'full', warnings?: PrintWarning[], arabicShaping: boolean = false, language: string = 'en', codePage?: number): Buffer {
  const lines: string[] = [];
  const date = parseDbTimestamp(order.created_at);
  const L = receiptLabels(language);

  const dash = '-'.repeat(cols);

  const prefix = resolveCurrencyPrefix(biz.currency_symbol || '₹', useUnicode, codePage);
  const trimDecimals = biz.trim_decimals === true;
  const locale = getCountryByCode(biz.country)?.locale ?? 'en-US';
  const amtLen = itemAmountWidth(order, prefix, locale, trimDecimals, cols);
  const itemNameLen = itemNameWidth(cols, amtLen);
  const tzOptions = biz.timezone ? { timeZone: biz.timezone } : undefined;

  lines.push('{INIT}');
  if (isReprint) lines.push('{CENTER}{BOLD}{DOUBLE_HEIGHT}{DOUBLE_WIDTH}' + L.reprint + '{/DOUBLE_WIDTH}{/DOUBLE_HEIGHT}{/BOLD}{/CENTER}');

  // Header: store name (Font A, big + bold), then customer name (Font B) and
  // mobile number, each only if the bill actually has that data.
  if (biz.show_name !== false && biz.name) lines.push('{STORE_NAME}{CENTER}{BOLD}{DOUBLE_HEIGHT}{DOUBLE_WIDTH}' + biz.name + '{/DOUBLE_WIDTH}{/DOUBLE_HEIGHT}{/BOLD}{/CENTER}');
  if (biz.show_customer_name !== false && biz.customer_name) lines.push('{CENTER}{FONT_B}' + biz.customer_name + '{/FONT_B}{/CENTER}');
  if (biz.show_customer_phone !== false && biz.customer_phone) lines.push('{CENTER}' + biz.customer_phone + '{/CENTER}');

  lines.push(dash);
  lines.push('{CENTER}' + L.invoiceNo + (bill.bill_number || order.order_number) + '{/CENTER}');
  lines.push('{CENTER}' + date.toLocaleDateString(locale + '-u-nu-latn', tzOptions) + ' ' + date.toLocaleTimeString(locale + '-u-nu-latn', tzOptions) + '{/CENTER}');
  if (biz.show_table_number !== false && order.table?.name) lines.push('{CENTER}' + L.table + order.table.name + '{/CENTER}');
  lines.push(dash);

  lines.push(itemHeader(itemNameLen, amtLen, L));
  lines.push(dash);

  if (order.items) {
    for (const item of order.items) {
      lines.push(...itemRows(item, itemNameLen, amtLen, cols, prefix, locale, trimDecimals, L.offered));

      const addons = parseAddons(item.addons);
      for (const addon of addons) {
        lines.push(...addonRows(addon, itemNameLen, amtLen, cols, prefix, locale, trimDecimals));
      }
      if (item.special_instructions) {
        lines.push('  ' + L.note + truncate(item.special_instructions, cols - L.note.length - 2));
      }
    }
  }

  lines.push(dash);

  // Redeemed points sit above the subtotal, only if present.
  if (biz.points_redeemed > 0) {
    const label = L.pointsRedeemed;
    lines.push(label + rightAlign('-' + biz.points_redeemed + ' ' + L.pointsUnit, cols - label.length));
  }

  lines.push(...financialRows(L.subtotal, formatCurrency(bill.subtotal, prefix, locale, trimDecimals), cols));
  if (bill.discount_amount > 0) {
    lines.push(...financialRows(L.discount, '-' + formatCurrency(bill.discount_amount, prefix, locale, trimDecimals), cols));
  }
  // So much a head. Printed only when there is one, and it says the arithmetic
  // out loud — "Coperto 4 x 2,00" — because a guest who is charged for the
  // table being laid is owed the reason.
  if (Number(bill.cover_charge) > 0) {
    const heads = Number(order?.guest_count || 0);
    // Only spell out "4 x 2,00" when it multiplies back to the amount printed
    // beside it, as the guest at the table will check it. It will not once a
    // fixed menu carries the cover for part of the table.
    const perHead = heads > 0 ? Number((Number(bill.cover_charge) / heads).toFixed(2)) : 0;
    const divides = heads > 0 && Math.abs(perHead * heads - Number(bill.cover_charge)) < 0.005;
    const coverLabel = divides
      ? `${L.cover} ${heads} x ${formatCurrency(perHead, prefix, locale, trimDecimals)}`
      : L.cover;
    lines.push(...financialRows(coverLabel, formatCurrency(bill.cover_charge, prefix, locale, trimDecimals), cols));
  }
  lines.push(...financialRows(L.total, formatCurrency(bill.total, prefix, locale, trimDecimals), cols).map((line) => `{BOLD}${line}{/BOLD}`));

  if (bill.payment_details) {
    try {
      const payments = typeof bill.payment_details === 'string' ? JSON.parse(bill.payment_details) : bill.payment_details;
      if (payments && Array.isArray(payments)) {
        for (const payment of payments) {
          if (payment && payment.method) {
            const methodLabel = truncate(capitalize(String(payment.method)), cols - 12);
            lines.push(...financialRows(methodLabel, formatCurrency(payment.amount, prefix, locale, trimDecimals), cols));
          }
        }
      }
    } catch (err: any) {
      console.warn('[Printer] Failed to parse payment details JSON:', err.message);
    }
  }

  // Earned points this bill + running balance, each only if nonzero.
  const hasEarned = biz.points_earned > 0;
  const hasBalance = biz.points_balance !== null && biz.points_balance !== undefined && biz.points_balance !== 0;
  if (hasEarned || hasBalance) {
    lines.push(dash);
    if (hasEarned) lines.push(L.pointsEarned + rightAlign(String(biz.points_earned), cols - L.pointsEarned.length));
    if (hasBalance) lines.push(L.pointsBalance + rightAlign(String(biz.points_balance), cols - L.pointsBalance.length));
  }

  // Footer: store contact details, only the ones actually configured.
  const footerLines: string[] = [];
  if (biz.show_address !== false && biz.address) footerLines.push(biz.address);
  if (biz.show_phone !== false && biz.phone) footerLines.push(L.phone + biz.phone);
  if (biz.show_tax_id === true && biz.taxRegistrationNumber) footerLines.push((getCountryByCode(biz.country)?.taxIdLabel || 'Tax ID') + ': ' + biz.taxRegistrationNumber);
  if (biz.instagram_handle) footerLines.push(biz.instagram_handle);
  if (footerLines.length > 0) {
    lines.push(dash);
    for (const footerLine of footerLines) pushCenteredWrapped(lines, footerLine, cols);
  }

  if (biz.footer_note) pushCenteredWrapped(lines, biz.footer_note, cols);

  lines.push('{CUT}');

  return buildEscPos(lines, useUnicode, { cutMode, arabicShaping, codePage }, warnings);
}

// Item row layout: [ name (nameLen) ][ qty (4) ][ amount right-aligned (amtLen) ].
// Rows stay inline when the value fits; an oversized amount continues on
// full-width lines.
function itemHeader(nameLen: number, amtLen: number, L: ReceiptLabels = RECEIPT_LABELS.en): string {
  const qtyW = 4;
  const item = L.itemCol.slice(0, nameLen).padEnd(nameLen);
  const qty = L.qtyCol.slice(0, qtyW).padEnd(qtyW);
  const amount = L.amountCol.slice(0, Math.max(1, amtLen - 1));
  return (
    item + qty + ' '.repeat(amtLen - amount.length) + amount
  );
}

function itemNameWidth(cols: number, amtLen: number): number {
  return Math.max(1, cols - 4 - amtLen);
}

function itemAmountWidth(
  order: { items?: Array<{ total?: number; addons?: unknown }> } | null | undefined,
  prefix: string,
  locale: string,
  trimDecimals: boolean,
  cols: number,
): number {
  // rightAlign() keeps at least one separator before an amount, so reserve
  // that separator when a long currency prefix expands the amount column.
  let width = 10;
  for (const item of order?.items ?? []) {
    width = Math.max(width, formatCurrency(item.total ?? 0, prefix, locale, trimDecimals).length + 1);
    for (const addon of parseAddons(item.addons)) {
      if (addon?.price) {
        width = Math.max(width, formatCurrency(addon.price, prefix, locale, trimDecimals).length + 1);
      }
    }
  }
  return Math.min(width, Math.max(1, cols - 5));
}

function itemRows(item: any, nameLen: number, amtLen: number, cols: number, prefix: string, locale: string = 'en-US', trimDecimals: boolean = false, offeredLabel?: string): string[] {
  const qtyW = 4;
  const name = truncate(item.product_name, nameLen).padEnd(nameLen);
  const qty = String(item.quantity).padEnd(qtyW);
  const label = name + qty;
  // A row worth nothing was given away — say so, rather than printing a 0,00
  // the guest has to interpret. A row whose price is simply not set yet is a
  // different thing and keeps its zero, so the omission stays visible.
  const offered = offeredLabel && Number(item.total) === 0 && !item.price_required;
  const amount = offered ? offeredLabel : formatCurrency(item.total, prefix, locale, trimDecimals);
  const inlineWidth = Math.max(1, cols - label.length - 1);
  if (amount.length <= inlineWidth) return [label + rightAlign(amount, cols - label.length)];
  return [label.trimEnd(), ...wrapValue(amount, cols)];
}

function addonRows(addon: any, nameLen: number, amtLen: number, cols: number, prefix: string, locale: string = 'en-US', trimDecimals: boolean = false): string[] {
  const label = truncate('  + ' + addon.name, nameLen).padEnd(nameLen);
  if (!addon.price) return [label + ' '.repeat(Math.max(0, cols - label.length))];
  const price = formatCurrency(addon.price, prefix, locale, trimDecimals);
  const inlineWidth = Math.max(1, cols - label.length - 1);
  if (price.length <= inlineWidth) return [label + rightAlign(price, cols - label.length)];
  return [label.trimEnd(), ...wrapValue(price, cols)];
}

function financialRows(label: string, value: string, cols: number): string[] {
  const safeLabel = label.slice(0, Math.max(1, cols - 1));
  const inlineWidth = Math.max(1, cols - safeLabel.length - 1);
  if (value.length <= inlineWidth) {
    return [safeLabel + rightAlign(value, cols - safeLabel.length)];
  }
  return [safeLabel, ...wrapValue(value, cols)];
}

function wrapValue(value: string, cols: number): string[] {
  const width = Math.max(1, cols);
  const lines: string[] = [];
  for (let offset = 0; offset < value.length; offset += width) {
    lines.push(value.slice(offset, offset + width));
  }
  return lines.length > 0 ? lines : [''];
}

function parseAddons(addons: any): any[] {
  return Array.isArray(addons) ? addons : [];
}

function getSafeLatnLocale(locale: string | undefined): string {
  if (!locale) return 'en-US-u-nu-latn';
  if (/-nu-[a-z0-9]+/i.test(locale)) {
    return locale.replace(/-nu-[a-z0-9]+/i, '-nu-latn');
  }
  if (locale.includes('-u-')) {
    return `${locale}-nu-latn`;
  }
  return `${locale}-u-nu-latn`;
}

function formatCurrency(amount: number, prefix: string, locale: string = 'en-US', trimDecimals: boolean = false): string {
  const numeric = Number(amount) || 0;
  const hasDecimals = Math.round(numeric * 100) % 100 !== 0;
  const safeLocale = getSafeLatnLocale(locale);
  const formattedNum = numeric.toLocaleString(safeLocale, {
    minimumFractionDigits: trimDecimals && !hasDecimals ? 0 : 2,
    maximumFractionDigits: 2,
  }).replace(/[\u00A0\u202F]/g, ' ');
  return prefix + formattedNum;
}

function rightAlign(text: string, width: number = 24): string {
  return ' '.repeat(Math.max(1, width - text.length)) + text;
}

function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length - 2) + '..' : text;
}

function capitalize(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function wrapText(text: string, cols: number): string[] {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > cols) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += cols) {
        lines.push(word.slice(i, i + cols));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= cols) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function pushWrapped(lines: string[], text: string, cols: number): void {
  for (const line of wrapText(text, cols)) lines.push(line);
}

function pushCenteredWrapped(lines: string[], text: string, cols: number): void {
  for (const line of wrapText(text, cols)) lines.push('{CENTER}' + line + '{/CENTER}');
}

/**
 * Receipt labels. Same policy as the kitchen-ticket table: only the languages
 * this build actually prints for are spelled out, and anything else falls back
 * to English rather than producing a half-translated bill.
 */
interface ReceiptLabels {
  reprint: string;
  /** Classic template wording. */
  invoiceNo: string;
  /** Compact template wording. */
  billNo: string;
  date: string;
  table: string;
  customer: string;
  customerPhone: string;
  itemCol: string;
  qtyCol: string;
  amountCol: string;
  note: string;
  cover: string;
  offered: string;
  pointsRedeemed: string;
  pointsEarned: string;
  pointsBalance: string;
  pointsUnit: string;
  subtotal: string;
  discount: string;
  total: string;
  phone: string;
  thankYou: string;
}

const RECEIPT_LABELS: Record<string, ReceiptLabels> = {
  en: {
    reprint: '** REPRINT **',
    invoiceNo: 'Invoice #: ',
    billNo: 'Bill #: ',
    date: 'Date: ',
    table: 'Table: ',
    customer: 'Customer: ',
    customerPhone: 'Customer No: ',
    itemCol: 'Item',
    qtyCol: 'Qty',
    amountCol: 'Amount',
    note: 'Note: ',
    cover: 'Cover',
    offered: 'On the house',
    pointsRedeemed: 'Points Redeemed',
    pointsEarned: 'Points Earned',
    pointsBalance: 'Points Balance',
    pointsUnit: 'pts',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'TOTAL',
    phone: 'Ph: ',
    thankYou: 'Thank you!',
  },
  it: {
    reprint: '** RISTAMPA **',
    invoiceNo: 'Conto n.: ',
    billNo: 'Conto n.: ',
    date: 'Data: ',
    table: 'Tavolo: ',
    customer: 'Cliente: ',
    customerPhone: 'Telefono: ',
    itemCol: 'Articolo',
    qtyCol: 'Qta',
    amountCol: 'Importo',
    note: 'Nota: ',
    cover: 'Coperto',
    offered: 'Offerto',
    pointsRedeemed: 'Punti usati',
    pointsEarned: 'Punti accumulati',
    pointsBalance: 'Saldo punti',
    pointsUnit: 'pt',
    subtotal: 'Subtotale',
    discount: 'Sconto',
    total: 'TOTALE',
    phone: 'Tel: ',
    thankYou: 'Grazie!',
  },
};

function receiptLabels(language: string): ReceiptLabels {
  return RECEIPT_LABELS[language] || RECEIPT_LABELS.en;
}

/** Store UI language, for print paths that render their own labels. */
function getPrintLanguage(): string {
  try {
    return getSettingValue('language') || 'en';
  } catch {
    // No database (unit tests calling the formatters directly): English.
    return 'en';
  }
}

/**
 * Kitchen-ticket labels. Only the languages this build actually serves in a
 * kitchen are spelled out; anything else falls back to English rather than
 * printing a half-translated ticket.
 */
interface KotLabels {
  table: string;
  takeaway: string;
  ticket: string;
  round: (n: number) => string;
  covers: (n: number) => string;
  reprint: string;
  orderNote: string;
  other: string;
  summary: (lines: number, pieces: number) => string;
}

const KOT_LABELS: Record<string, KotLabels> = {
  en: {
    table: 'TABLE',
    takeaway: 'TAKEAWAY',
    ticket: 'KITCHEN TICKET',
    round: (n) => `KITCHEN TICKET NO. ${n}`,
    covers: (n) => `${n} covers`,
    reprint: '*** RE-PRINT ***',
    orderNote: 'ORDER NOTE',
    other: 'OTHER',
    summary: (lines, pieces) => `${lines} lines - ${pieces} items`,
  },
  it: {
    table: 'TAVOLO',
    takeaway: 'ASPORTO',
    ticket: 'COMANDA',
    round: (n) => `COMANDA N. ${n}`,
    covers: (n) => `${n} coperti`,
    reprint: '*** RISTAMPA ***',
    orderNote: 'NOTA TAVOLO',
    other: 'ALTRO',
    summary: (lines, pieces) => `${lines} righe - ${pieces} pezzi`,
  },
};

function kotLabels(language: string): KotLabels {
  return KOT_LABELS[language] || KOT_LABELS.en;
}

/**
 * A horizontal rule carrying a label at its left edge, e.g.
 * `== ANTIPASTI ==================================`. Used to mark where one
 * category ends and the next begins on a station that cooks more than one.
 */
function labelledRule(label: string, cols: number, char: string): string {
  const head = `${char.repeat(2)} ${truncate(label, Math.max(1, cols - 6))} `;
  return head + char.repeat(Math.max(0, cols - head.length));
}

/**
 * Groups ticket rows by product category, preserving the order the categories
 * first appear (which follows the order the items were added to the check).
 */
function groupKotItemsByCategory(items: any[]): { name: string | null; items: any[] }[] {
  const groups: { name: string | null; items: any[] }[] = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const key = String(item?.category_id ?? item?.category_name ?? '');
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({ name: item?.category_name ?? null, items: [] });
    }
    groups[index].items.push(item);
  }
  return groups;
}

/**
 * A detail line under a dish - an add-on or a note. The marker only appears on
 * the first line; continuations align under the text, so a long note reads as
 * one block instead of a list of fragments. wrapText() collapses leading
 * whitespace, which is why the indent is reapplied per line rather than baked
 * into the string handed to it.
 */
function pushKotDetail(lines: string[], marker: string, text: string, cols: number, bold: boolean): void {
  const indent = '    ';
  const width = Math.max(1, cols - indent.length - marker.length - 1);
  wrapText(text, width).forEach((part, index) => {
    const prefix = index === 0 ? marker : ' '.repeat(marker.length);
    const rendered = `${indent}${prefix} ${part}`;
    lines.push(bold ? `{BOLD}${rendered}{/BOLD}` : rendered);
  });
}

/**
 * One dish, as the cook reads it: a right-aligned quantity column so the eye
 * can scan quantities alone, then the name in double height. Wrapped names
 * hang under the name column rather than restarting at the margin, which keeps
 * the quantity column unambiguous.
 */
function pushKotItemName(lines: string[], quantity: unknown, name: string, cols: number): void {
  const qty = String(Number(quantity) || 0);
  const gutter = Math.max(4, qty.length + 3);
  const indent = ' '.repeat(gutter);
  const wrapped = wrapText(name.toUpperCase(), Math.max(1, cols - gutter));
  const first = `${qty.padStart(gutter - 2, ' ')}  ${wrapped[0] ?? ''}`;
  lines.push(`{DOUBLE_HEIGHT}{BOLD}${first}{/BOLD}{/DOUBLE_HEIGHT}`);
  for (const continuation of wrapped.slice(1)) {
    lines.push(`{DOUBLE_HEIGHT}{BOLD}${indent}${continuation}{/BOLD}{/DOUBLE_HEIGHT}`);
  }
}

export function formatKOT(order: any, items: any[], stationName: string, cols: number = 48, useUnicode: boolean = false, cutMode: PrinterCutMode = 'full', locale: string = 'en-US', tzOptions?: any, warnings?: PrintWarning[], arabicShaping: boolean = false, batch?: number, language: string = 'en', isReprint: boolean = false, codePage?: number): Buffer {
  const lines: string[] = [];
  const L = kotLabels(language);
  const rule = '='.repeat(cols);
  const thinRule = '-'.repeat(cols);
  // Double width halves how many characters fit on a line.
  const wideCols = Math.max(1, Math.floor(cols / 2));

  lines.push('{INIT}');

  // The table is what the cook and the runner match food against, so it gets
  // the largest type on the ticket and the top of the paper.
  const headline = order.table?.name ? `${L.table} ${order.table.name}` : L.takeaway;
  lines.push(`{CENTER}{DOUBLE_WIDTH}{DOUBLE_HEIGHT}{BOLD}${truncate(headline.toUpperCase(), wideCols)}{/BOLD}{/DOUBLE_HEIGHT}{/DOUBLE_WIDTH}{/CENTER}`);
  lines.push(`{CENTER}{DOUBLE_HEIGHT}${truncate(batch ? L.round(batch) : L.ticket, wideCols)}{/DOUBLE_HEIGHT}{/CENTER}`);
  if (isReprint) {
    lines.push(`{CENTER}{BOLD}${L.reprint}{/BOLD}{/CENTER}`);
  }

  // Everything the kitchen rarely needs collapses into one condensed line:
  // the send time (not the order's creation time - on a later round the two
  // are far apart), the covers, and which station this paper came out of.
  const sentAt = new Date().toLocaleTimeString(`${locale}-u-nu-latn`, { hour: '2-digit', minute: '2-digit', ...(tzOptions || {}) });
  const meta = [sentAt, order.guest_count ? L.covers(order.guest_count) : '', stationName]
    .filter((part) => Boolean(part))
    .join(' - ');
  lines.push(`{CENTER}{FONT_B}${truncate(meta, cols)}{/FONT_B}{/CENTER}`);
  lines.push(rule);

  const groups = groupKotItemsByCategory(items);
  // A single-category ticket needs no headers - they would only add noise.
  const showCategoryHeaders = groups.length > 1;

  groups.forEach((group, groupIndex) => {
    if (showCategoryHeaders) {
      if (groupIndex > 0) lines.push('');
      lines.push(`{BOLD}${labelledRule((group.name || L.other).toUpperCase(), cols, '=')}{/BOLD}`);
    }
    group.items.forEach((item, itemIndex) => {
      // A thin rule between dishes: without it a dish carrying two lines of
      // notes runs straight into the next one.
      if (itemIndex > 0) lines.push(thinRule);
      pushKotItemName(lines, item.quantity, String(item.product_name ?? ''), cols);
      for (const addon of parseAddons(item.addons)) {
        if (addon?.name) {
          pushKotDetail(lines, '+', String(addon.name), cols, false);
        }
      }
      if (item.special_instructions) {
        // Notes carry a different marker from add-ons and are bold: they are
        // the line a cook cannot afford to skim past.
        pushKotDetail(lines, '>>', String(item.special_instructions), cols, true);
      }
    });
  });

  lines.push(rule);

  if (order.special_instructions) {
    lines.push(`{BOLD}${L.orderNote}{/BOLD}`);
    for (const noteLine of wrapText(String(order.special_instructions), cols)) {
      lines.push(`{BOLD}${noteLine}{/BOLD}`);
    }
    lines.push(rule);
  }

  // A closing count so the pass can check at a glance that nothing is missing,
  // plus the order number: too rarely needed to earn large type, too useful for
  // tracing a ticket back to its order to leave off entirely.
  const pieces = items.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
  const footer = [L.summary(items.length, pieces), order.order_number].filter((part) => Boolean(part)).join(' - ');
  lines.push(`{FONT_B}${footer}{/FONT_B}`);
  lines.push('{CUT}');

  return buildEscPos(lines, useUnicode, { cutMode, arabicShaping, codePage }, warnings);
}

/**
 * End-of-day report labels. Same policy as the receipt and kitchen-ticket
 * tables: only the languages this build actually prints for are spelled out,
 * and anything else falls back to English rather than printing half-translated.
 */
interface DayReportLabels {
  title: string;
  date: string;
  opened: string;
  closed: string;
  printed: string;
  orders: string;
  completed: string;
  cancelled: string;
  covers: string;
  bills: string;
  takings: string;
  byMethod: string;
  discounts: string;
  topProducts: string;
  notes: string;
}

const DAY_REPORT_LABELS: Record<string, DayReportLabels> = {
  en: {
    title: 'END OF DAY',
    date: 'Date',
    opened: 'Opened',
    closed: 'Closed',
    printed: 'Printed',
    orders: 'Orders',
    completed: 'completed',
    cancelled: 'cancelled',
    covers: 'Covers',
    bills: 'Bills paid',
    takings: 'TAKINGS',
    byMethod: 'BY PAYMENT METHOD',
    discounts: 'Discounts',
    topProducts: 'BEST SELLERS',
    notes: 'Notes',
  },
  it: {
    title: 'CHIUSURA GIORNATA',
    date: 'Data',
    opened: 'Aperta',
    closed: 'Chiusa',
    printed: 'Stampata',
    orders: 'Ordini',
    completed: 'completati',
    cancelled: 'annullati',
    covers: 'Coperti',
    bills: 'Conti saldati',
    takings: 'INCASSO',
    byMethod: 'PER METODO DI PAGAMENTO',
    discounts: 'Sconti',
    topProducts: 'PIU VENDUTI',
    notes: 'Note',
  },
};

/**
 * The day's closing report — the paper "chiusura di cassa". Built from the
 * summary frozen at close, so reprinting it days later gives the same numbers
 * the floor saw that night. See docs/table-management.md.
 */
export function formatServiceDayReport(
  day: any,
  summary: any,
  business?: any,
  cols: number = 48,
  useUnicode: boolean = false,
  cutMode: PrinterCutMode = 'full',
  locale: string = 'en-US',
  tzOptions?: any,
  language: string = 'en',
  codePage?: number,
): Buffer {
  const biz = business || {};
  const L = DAY_REPORT_LABELS[language] || DAY_REPORT_LABELS.en;
  const prefix = resolveCurrencyPrefix(biz.currency_symbol || '₹', useUnicode, codePage);
  const money = (amount: number) => formatCurrency(Number(amount) || 0, prefix, locale, biz.trim_decimals === true);
  const safeLocale = getSafeLatnLocale(locale);
  const bar = '='.repeat(cols);
  const rule = '-'.repeat(cols);
  /** Label left, value hard against the right edge — the shape a till roll reads best. */
  const row = (left: string, right: string) => left + rightAlign(right, Math.max(1, cols - left.length));

  const clock = (date: Date) => date.toLocaleString(safeLocale, {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', ...(tzOptions || {}),
  });
  const stamp = (value: string | null | undefined) => {
    if (!value) return '-';
    const parsed = parseDbTimestamp(value);
    return isNaN(parsed.getTime()) ? '-' : clock(parsed);
  };

  const businessDate = (() => {
    const [year, month, date] = String(day?.business_date || '').split('-').map(Number);
    if (!year || !month || !date) return String(day?.business_date || '-');
    // A bare calendar date, so it is formatted in UTC — running it through the
    // store timezone would shift the label onto the wrong day.
    return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString(safeLocale, {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
  })();

  const lines: string[] = [
    '{INIT}',
  ];
  if (biz.name) lines.push(`{CENTER}{BOLD}${biz.name}{/BOLD}{/CENTER}`);
  lines.push(
    `{CENTER}{BOLD}${L.title}{/BOLD}{/CENTER}`,
    bar,
    row(`${L.date}:`, businessDate),
    row(`${L.opened}:`, stamp(day?.opened_at)),
    row(`${L.closed}:`, stamp(day?.closed_at)),
    row(`${L.printed}:`, clock(new Date())),
    bar,
    row(L.orders, String(summary?.orders?.total ?? 0)),
    row(`  ${L.completed}`, String(summary?.orders?.completed ?? 0)),
    row(`  ${L.cancelled}`, String(summary?.orders?.cancelled ?? 0)),
    row(L.covers, String(summary?.covers ?? 0)),
    row(L.bills, `${summary?.bills?.paid ?? 0} / ${summary?.bills?.count ?? 0}`),
    rule,
    `{BOLD}${row(L.takings, money(summary?.takings?.total ?? 0))}{/BOLD}`,
  );

  const byMethod = Array.isArray(summary?.takings?.byMethod) ? summary.takings.byMethod : [];
  if (byMethod.length > 0) {
    lines.push(rule, L.byMethod);
    for (const entry of byMethod) {
      lines.push(row(`  ${truncate(capitalize(String(entry?.method || '')), Math.max(4, cols - 14))}`, money(entry?.total ?? 0)));
    }
  }

  if (Number(summary?.discounts) > 0) {
    lines.push(rule, row(L.discounts, money(summary.discounts)));
  }

  const topProducts = Array.isArray(summary?.topProducts) ? summary.topProducts : [];
  if (topProducts.length > 0) {
    lines.push(rule, L.topProducts);
    for (const entry of topProducts) {
      lines.push(row(`  ${truncate(String(entry?.name || ''), Math.max(4, cols - 10))}`, `x ${entry?.quantity ?? 0}`));
    }
  }

  lines.push(bar);
  if (day?.notes) {
    for (const wrapped of wrapText(`${L.notes}: ${day.notes}`, cols)) lines.push(wrapped);
    lines.push(bar);
  }
  lines.push('{CUT}');

  return buildEscPos(lines, useUnicode, { cutMode, codePage });
}

/** Dispatch the closing report to the configured printer. */
export async function printServiceDayReport(day: any, summary: any, business?: any, useUnicode: boolean = false, signal?: AbortSignal): Promise<DispatchResult> {
  try {
    if (signal?.aborted) return { ok: false, detail: 'Print cancelled during shutdown' };
    const printer = getPrinterConfig();
    if (!printer) return { ok: false, detail: 'No printer configured' };

    const profile = resolvePrinterProfile(printer);
    const cols = getColumnsForPrinter(printer, profile);
    const country = getSettingValue('country');
    const timezone = getSettingValue('timezone');
    const locale = country ? getCountryByCode(country)?.locale ?? 'en-US' : 'en-US';
    const tzOptions = timezone ? { timeZone: timezone } : undefined;

    const data = formatServiceDayReport(
      day, summary, business, cols, useUnicode, profile.cutMode, locale, tzOptions,
      getPrintLanguage(), profile.codePage,
    );
    return await dispatchPrint(printer, data, signal);
  } catch (error: any) {
    console.error('[Printer] Day report print error:', error);
    return { ok: false, detail: error?.message };
  }
}

export function buildTestPage(paperWidth: string = '80mm', cutMode: PrinterCutMode = 'full', codePage?: number): Buffer {
  const width = columnsForPaperWidth(paperWidth) || 48;
  const bar = '='.repeat(width);
  const ruler = Array.from({ length: width }, (_, i) => String((i + 1) % 10)).join('');
  const edgeProbe = 'X'.repeat(width);
  const lines = [
    '{INIT}',
    '{CENTER}{BOLD}BuonApp Printer Test{/BOLD}{/CENTER}',
    '',
    bar,
    '{CENTER}Network / USB test print{/CENTER}',
    bar,
    '',
    `Columns: ${width}`,
    'If the next line wraps, choose',
    'a smaller column value.',
    ruler,
    edgeProbe,
    bar,
    // Accent probe. Kitchen tickets and receipts rely on the printer's
    // code page to render Western European text; if this line comes out as
    // garbage or blank, the profile's codePage is wrong for this hardware
    // and dish names with accents will not print as intended.
    'Accents: \u00E0 \u00E8 \u00E9 \u00EC \u00F2 \u00F9 \u00C0 \u00C8 \u00C9 \u00CC \u00D2 \u00D9',
    codePage === undefined ? 'Code page: none (accents become plain letters)' : `Code page: ${codePage}`,
    bar,
    `Time: ${new Date().toLocaleString('en-US-u-nu-latn')}`,
    '',
    bar,
    '{CENTER}If you can read this, your printer is working!{/CENTER}',
    bar,
    '{CUT}',
  ];
  return buildEscPos(lines, false, { cutMode, codePage });
}

// Every ASCII fallback is no wider than 3 characters, so currency labels such
// as USD/EUR/INR have a stable reserved slot in receipt amount columns.
const CURRENCY_ASCII_MAP: Record<string, string> = {
  '₹': 'Rs', '₨': 'Rs', '€': 'EUR', '£': 'GBP', '¥': 'Yen',
  '₩': 'KRW', '₺': 'TRY', '₫': 'VND', '₪': 'ILS', '₽': 'RUB',
  '฿': 'THB', '₱': 'PHP', '₴': 'UAH', '₦': 'NGN', '₵': 'GHS',
  '₡': 'CRC', '₲': 'PYG', 'د.إ': 'AED', '﷼': 'SAR', 'ریال': 'IRR', '৳': 'BDT',
  'E£': 'EGP',
};

// Resolves the currency symbol into the exact text that will be printed,
// padded to a fixed 3-column slot (leading spaces for shorter symbols/codes).
// symbol). Must run BEFORE rightAlign() computes padding — swapping the
// symbol out afterwards (e.g. '₹' -> 'Rs') changes the string length and
// pushes trailing digits onto the next line.
function resolveCurrencyPrefix(symbol: string, useUnicode: boolean, codePage?: number): string {
  // fa-IR resolves IRR to the textual token "ریال". Generic ESC/POS printers
  // cannot shape that token, so normalize this known currency even when the
  // caller requests Unicode. Preserve the existing useUnicode behavior for
  // every other currency value.
  const normalizedSymbol = symbol === 'ریال' ? 'IRR' : symbol;
  const isAsciiSafe = /^[\x00-\x7F]+$/.test(normalizedSymbol);
  // A declared code page renders symbols like the euro sign directly, so there
  // is no reason to fall back to a three-letter code on that hardware.
  const codePageCanRender = codePage !== undefined && isCodePageRepresentable(normalizedSymbol);
  const rawPrefix = (useUnicode || isAsciiSafe || codePageCanRender)
    ? normalizedSymbol
    : (CURRENCY_ASCII_MAP[normalizedSymbol] || normalizedSymbol.slice(0, 3).toUpperCase() || 'Rs');
  const prefix = rawPrefix.length > 3 ? rawPrefix.slice(0, 3) : rawPrefix;
  return prefix.length >= 3 ? prefix : ' '.repeat(3 - prefix.length) + prefix;
}

// Arabic (incl. Persian) Unicode blocks: Arabic, Arabic Supplement, Arabic
// Extended-A, Arabic Presentation Forms-A/B. These scripts require contextual
// shaping and bidirectional ordering that generic ESC/POS firmware does not
// implement — a printer profile must declare `arabicShaping` before they are
// emitted as UTF-8 bytes.
const ARABIC_SCRIPT_GLOBAL_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Strips Latin diacritics down to plain ASCII (rago-grave -> ragu, creme
 * brulee -> creme brulee) and folds typographic punctuation to its ASCII
 * equivalent. Used as a last resort for printers with no declared code page:
 * a transliterated dish name is imperfect, but a dropped line means the
 * kitchen never sees the dish at all.
 */
function transliterateToAscii(text: string): string {
  return text
    // NFD splits an accented letter into base + combining mark, so removing
    // the marks leaves the plain letter behind.
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    // Letters with no decomposition need explicit mappings.
    .replace(/\u00DF/g, 'ss')
    .replace(/\u00C6/g, 'AE')
    .replace(/\u00E6/g, 'ae')
    .replace(/[\u00D8]/g, 'O')
    .replace(/[\u00F8]/g, 'o')
    .replace(/[\u0110\u00D0]/g, 'D')
    .replace(/[\u0111\u00F0]/g, 'd')
    // Typographic punctuation that word processors and menu imports carry in.
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '\"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2007\u202F]/g, ' ');
}

/**
 * WPC1252 (code page 16) agrees with Latin-1 everywhere except 0x80-0x9F,
 * where it carries the euro sign and typographic punctuation instead of
 * control codes. Encoding as plain 'latin1' would silently lose those, so
 * that range gets an explicit table.
 */
const CP1252_HIGH_RANGE: Record<string, number> = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F,
};

/** Byte -> character, for turning a code-page payload back into readable text. */
const CP1252_HIGH_RANGE_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(CP1252_HIGH_RANGE).map(([char, byte]) => [byte, char]),
);

/** Whether every character has a byte in the printer's single-byte table. */
function isCodePageRepresentable(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code <= 0xFF) continue;
    if (CP1252_HIGH_RANGE[char] !== undefined) continue;
    return false;
  }
  return true;
}

/** Encodes a line the printer's selected code page can render. */
function encodeCodePageLine(text: string): Buffer {
  const bytes: number[] = [];
  for (const char of text) {
    const mapped = CP1252_HIGH_RANGE[char];
    bytes.push(mapped !== undefined ? mapped : char.codePointAt(0)! & 0xFF);
  }
  return Buffer.from(bytes);
}

function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/** Precise warning that distinguishes Arabic shaping from generic unsupported chars. */
function makeUnsupportedLineWarning(isStoreName: boolean, text: string): string {
  const label = isStoreName ? 'Store name' : 'Receipt line';
  const why = hasArabicScript(text)
    ? 'it contains Persian/Arabic script and the printer does not declare Arabic shaping support'
    : 'it contains unsupported characters';
  return `${label} was not printed because ${why}: ${text}`;
}

export function buildEscPos(lines: string[], _useUnicode: boolean = false, options: { cutMode?: PrinterCutMode; arabicShaping?: boolean; codePage?: number } = {}, warnings?: PrintWarning[]): Buffer {
  const buf: number[] = [];
  // With a declared code page the printer renders single-byte Western European
  // text, so accented lines can be encoded instead of dropped. Without one,
  // accents are transliterated below rather than sent as UTF-8 the printer
  // would render as garbage.
  const codePage = options.codePage;

  const resetAllStyles = () => {
    buf.push(0x1B, 0x45, 0x00);
    buf.push(0x1B, 0x21, 0x00);
    buf.push(0x1B, 0x61, 0x00);
  };

  for (let line of lines) {
    if (line.includes('{INIT}')) {
      buf.push(0x1B, 0x40);
      // ESC t n - select character code table. Must follow the reset, which
      // returns the printer to its power-on page.
      if (codePage !== undefined) buf.push(0x1B, 0x74, codePage & 0xFF);
      resetAllStyles();
      continue;
    }

    if (line.includes('{FEED}')) {
      buf.push(0x1B, 0x64, 0x05);
      continue;
    }

    if (line.includes('{CUT}')) {
      buf.push(0x1B, 0x64, 0x05);
      if (options.cutMode === 'partial') {
        buf.push(0x1D, 0x56, 0x42, 0x00);
      } else {
        buf.push(0x1D, 0x56, 0x00);
      }
      continue;
    }

    // Compose accents first. The same word can arrive precomposed (U+00F9) or
    // decomposed (u + U+0300) depending on where the text was typed or
    // imported from; only the composed form fits a single-byte code page, so
    // without this a macOS-pasted dish name would needlessly lose its accent.
    line = line.normalize('NFC');

    const isStoreName = line.includes('{STORE_NAME}');
    line = line.replace(/\{STORE_NAME\}/g, '');
    let printableLine = line.replace(/\{[A-Z_/]+\}/g, '');
    // Currency symbols are an existing, explicit printer option. Do not treat
    // them as a conflicting line; unsupported scripts (Arabic, CJK, emoji,
    // etc.) are different because generic ESC/POS printers cannot shape or
    // render them reliably.
    const textWithoutSupportedCurrency = printableLine.replace(/[₹₨€£¥₩₺₫₪₽฿₱₴₦₵₡₲]/g, '');
    // 'latin1' for a line whose bytes the selected code page renders directly;
    // 'utf8' otherwise, which is only ever reached by pure ASCII or by shaped
    // Arabic on hardware that declares support for it.
    let lineEncoding: BufferEncoding = 'utf8';
    if (/[^\x00-\x7F]/.test(textWithoutSupportedCurrency)) {
      // Allow Arabic/Persian script through only when the printer profile
      // explicitly declares Arabic shaping support AND the line contains no
      // other non-ASCII script. Otherwise skip it — never emit unshaped text.
      const arabicOnly = options.arabicShaping === true
        && hasArabicScript(printableLine)
        && !/[^\x00-\x7F]/.test(printableLine.replace(ARABIC_SCRIPT_GLOBAL_RE, ''));
      if (!arabicOnly && codePage !== undefined && isCodePageRepresentable(line)) {
        // Accented Latin text the code page renders natively - print as is.
        lineEncoding = 'latin1';
      } else if (!arabicOnly) {
        // No code page, or characters outside it. Transliteration keeps the
        // line on paper whenever the script has an ASCII fallback; only text
        // that still cannot be rendered (Arabic, CJK, emoji) is dropped.
        const transliterated = transliterateToAscii(line);
        const transliteratedPrintable = transliterated.replace(/\{[A-Z_/]+\}/g, '');
        if (!/[^\x00-\x7F]/.test(transliteratedPrintable.replace(/[₹₨€£¥₩₺₫₪₽฿₱₴₦₵₡₲]/g, ''))) {
          line = transliterated;
          printableLine = transliteratedPrintable;
        } else {
          if (warnings) {
            const text = printableLine.trim();
            warnings.push({
              field: isStoreName ? 'store name' : 'receipt line',
              text,
              message: makeUnsupportedLineWarning(isStoreName, text),
            });
          }
          continue;
        }
      }
    } else if (codePage !== undefined) {
      lineEncoding = 'latin1';
    }

    let lineBold = line.includes('{BOLD}');
    let lineDH = line.includes('{DOUBLE_HEIGHT}');
    let lineDW = line.includes('{DOUBLE_WIDTH}');
    // ESC/POS mode byte bit 0 selects the character font: 0 = Font A (12x24,
    // the default), 1 = Font B (9x17, condensed). No token means Font A.
    let lineFontB = line.includes('{FONT_B}');
    let center = line.startsWith('{CENTER}') && line.includes('{/CENTER}');

    line = line.replace(/\{CENTER\}/g, '').replace(/\{\/CENTER\}/g, '');
    line = line.replace(/\{BOLD\}/g, '').replace(/\{\/BOLD\}/g, '');
    line = line.replace(/\{DOUBLE_HEIGHT\}/g, '').replace(/\{\/DOUBLE_HEIGHT\}/g, '');
    line = line.replace(/\{DOUBLE_WIDTH\}/g, '').replace(/\{\/DOUBLE_WIDTH\}/g, '');
    line = line.replace(/\{FONT_B\}/g, '').replace(/\{\/FONT_B\}/g, '');

    buf.push(0x1B, 0x61, center ? 0x01 : 0x00);

    let mode = 0;
    if (lineDH) mode |= 0x10;
    if (lineDW) mode |= 0x20;
    if (lineBold) mode |= 0x08;
    if (lineFontB) mode |= 0x01;
    buf.push(0x1B, 0x21, mode);

    if (lineBold) {
      buf.push(0x1B, 0x45, 0x01);
    }

    buf.push(...(lineEncoding === 'latin1' ? encodeCodePageLine(line) : Buffer.from(line, lineEncoding)));
    buf.push(0x0A);
  }

  return Buffer.from(buf);
}

/** Convert the command subset emitted by buildEscPos() into a paperless text preview. */
export function escPosToText(data: Buffer | Uint8Array): string {
  const bytes = Buffer.from(data);
  const text: number[] = [];
  // A payload that selected a code page carries single-byte accented text, so
  // decoding it as UTF-8 would turn every accent into a replacement character.
  let singleByteText = false;

  for (let i = 0; i < bytes.length;) {
    const byte = bytes[i];
    if (byte === 0x1B) {
      const command = bytes[i + 1];
      if (command === 0x40) {
        i += 2;
      } else if (command === 0x74) {
        // ESC t n - select character code table.
        singleByteText = true;
        i += 3;
      } else if (command === 0x21 || command === 0x45 || command === 0x61) {
        i += 3;
      } else if (command === 0x64) {
        const feedLines = bytes[i + 2] || 0;
        for (let line = 0; line < feedLines; line++) text.push(0x0A);
        i += 3;
      } else {
        i += Math.min(2, bytes.length - i);
      }
      continue;
    }
    if (byte === 0x1D && bytes[i + 1] === 0x56) {
      const mode = bytes[i + 2];
      i += mode === 0x41 || mode === 0x42 ? 4 : 3;
      continue;
    }
    if (byte === 0x0D) {
      i += 1;
      continue;
    }
    text.push(byte);
    i += 1;
  }

  if (!singleByteText) return Buffer.from(text).toString('utf8').replace(/\n+$/, '');
  // Decoding as plain latin1 would turn the euro sign and the typographic
  // punctuation WPC1252 keeps at 0x80-0x9F into invisible control characters,
  // making the preview disagree with the paper.
  const decoded = text
    .map((byte) => CP1252_HIGH_RANGE_REVERSE[byte] ?? String.fromCharCode(byte))
    .join('');
  return decoded.replace(/\n+$/, '');
}

export async function printViaNetwork(ip: string, port: number, data: Buffer, signal?: AbortSignal): Promise<DispatchResult> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let settled = false;
    const onAbort = (): void => {
      client.destroy();
      finish({ ok: false, detail: 'Print cancelled during shutdown' });
    };
    const finish = (result: DispatchResult): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    client.connect(port, ip, () => {
      client.write(data, () => {
        client.end();
        finish({ ok: true });
      });
    });

    client.on('error', (err) => {
      console.error(`[Printer] Network error: ${err.message}`);
      client.destroy();
      finish({ ok: false, detail: `Network error: ${err.message}` });
    });

    client.setTimeout(5000, () => {
      client.destroy();
      finish({ ok: false, detail: `Timed out connecting to ${ip}:${port}` });
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

export async function printViaUSB(data: Buffer, printerName?: string, signal?: AbortSignal): Promise<DispatchResult> {
  console.log('[Printer] printViaUSB called, platform:', process.platform, 'printer:', printerName);

  if (process.platform === 'darwin' || process.platform === 'linux') {
    return await printViaCups(data, printerName, signal);
  }

  if (process.platform === 'win32') {
    return await printViaUSBWindows(data, printerName, signal);
  }

  console.warn('[Printer] Unsupported platform:', process.platform);
  return { ok: false, detail: `Unsupported platform: ${process.platform}` };
}

// `lp` exits 0 as soon as CUPS accepts the job into the queue, so a queue that
// is disabled — which is what CUPS does once the backend fails, e.g. after the
// printer is unplugged — would otherwise be reported to the cashier as a
// successful print. Mirrors the GetPrinter pre-flight on the Windows path.
//
// Returns a human-readable problem, or null to proceed. Anything unexpected
// (no CUPS, unknown queue) returns null so `lp` still gets its chance: this
// check only ever turns a silent failure into a visible one.
async function describeCupsQueueProblem(printerName?: string, signal?: AbortSignal): Promise<string | null> {
  if (!printerName) return null;

  // LC_ALL=C — the state words below are matched in English, and lpstat is localised.
  const opts = { encoding: 'utf8' as const, timeout: 5000, signal, env: { ...process.env, LC_ALL: 'C' } };

  try {
    const { stdout } = await execFileAsync('lpstat', ['-p', printerName], opts);
    if (/\bdisabled\b/i.test(stdout)) {
      const since = stdout.match(/disabled since [^\n]*/i);
      return since ? since[0].trim().replace(/\s+-\s*$/, '') : 'print queue is disabled';
    }
  } catch {
    return null;
  }

  try {
    const { stdout } = await execFileAsync('lpstat', ['-a', printerName], opts);
    if (/not accepting/i.test(stdout)) return 'print queue is not accepting jobs';
  } catch {
    return null;
  }

  return null;
}

async function printViaCups(data: Buffer, printerName?: string, signal?: AbortSignal): Promise<DispatchResult> {
  const label = printerName || 'default';

  const problem = await describeCupsQueueProblem(printerName, signal);
  if (signal?.aborted) return { ok: false, detail: 'Print cancelled during shutdown' };
  if (problem) {
    console.error(`[Printer] CUPS print aborted for "${label}": ${problem}`);
    return { ok: false, detail: problem };
  }

  const tmpFile = path.join(os.tmpdir(), `flo_print_${process.pid}_${Date.now()}.bin`);

  try {
    fs.writeFileSync(tmpFile, data);

    const args = printerName
      ? ['-d', printerName, '-o', 'raw', tmpFile]
      : ['-o', 'raw', tmpFile];
    const { stdout } = await execFileAsync('lp', args, { encoding: 'utf8', timeout: 20000, signal });

    console.log(`[Printer] CUPS print queued for "${label}" (${stdout.trim()})`);
    return { ok: true };
  } catch (err: any) {
    const detail = String(err.stderr || err.message || '').trim();
    console.error(`[Printer] CUPS print failed for "${label}": ${detail}`);
    return { ok: false, detail: detail || `CUPS print failed for "${label}"` };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// Raw ESC/POS on Windows has to bypass the print driver: node-thermal-printer's
// `printer:<name>` interface and PowerShell's `Start-Process -Verb PrintTo` both
// hand the document to a driver that must already understand it, and a thermal
// printer's driver does not. Writing to the spooler with datatype RAW is the
// documented way to get bytes through untouched.
//
// Kept as C# compiled at run time by Add-Type rather than a native addon so the
// app stays free of per-Electron-ABI prebuilds. Uses the *W entry points so
// printer names outside ASCII survive marshalling.
//
// NOTE: no backslash escapes, backticks, or `${` may appear in this source — it
// is embedded in a TS template literal and then in a single-quoted PowerShell
// here-string, and both would rewrite it.
const WINSPOOL_HELPER_SOURCE = `
using System;
using System.Runtime.InteropServices;

public static class FloRawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private class DOCINFO {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PRINTER_INFO_2 {
        public IntPtr pServerName;
        public IntPtr pPrinterName;
        public IntPtr pShareName;
        public IntPtr pPortName;
        public IntPtr pDriverName;
        public IntPtr pComment;
        public IntPtr pLocation;
        public IntPtr pDevMode;
        public IntPtr pSepFile;
        public IntPtr pPrintProcessor;
        public IntPtr pDatatype;
        public IntPtr pParameters;
        public IntPtr pSecurityDescriptor;
        public uint Attributes;
        public uint Priority;
        public uint DefaultPriority;
        public uint StartTime;
        public uint UntilTime;
        public uint Status;
        public uint cJobs;
        public uint AveragePPM;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "GetPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern bool GetPrinter(IntPtr hPrinter, int Level, IntPtr pPrinter, uint cbBuf, out uint pcbNeeded);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern uint StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFO pDocInfo);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    private const uint PRINTER_ATTRIBUTE_WORK_OFFLINE = 0x00000400;

    private static string DescribeBlockingState(uint status, uint attributes) {
        if ((attributes & PRINTER_ATTRIBUTE_WORK_OFFLINE) != 0) return "printer is set to 'Use Printer Offline' in Windows";
        if ((status & 0x00000080) != 0) return "printer is offline";
        if ((status & 0x00001000) != 0) return "printer is not available";
        if ((status & 0x00000010) != 0) return "printer is out of paper";
        if ((status & 0x00000008) != 0) return "printer has a paper jam";
        if ((status & 0x00400000) != 0) return "printer cover is open";
        if ((status & 0x00100000) != 0) return "printer needs attention";
        if ((status & 0x00000002) != 0) return "printer reported an error";
        return null;
    }

    // OpenPrinter succeeds against the queue even when the device is unplugged,
    // so without this the job would silently spool and we would report success.
    private static void EnsureReady(IntPtr hPrinter) {
        uint needed = 0;
        GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out needed);
        if (needed == 0) return;

        IntPtr buf = Marshal.AllocHGlobal((int)needed);
        try {
            uint unused = 0;
            if (!GetPrinter(hPrinter, 2, buf, needed, out unused)) return;
            PRINTER_INFO_2 info = (PRINTER_INFO_2)Marshal.PtrToStructure(buf, typeof(PRINTER_INFO_2));
            string problem = DescribeBlockingState(info.Status, info.Attributes);
            if (problem != null) throw new Exception(problem);
        } finally {
            Marshal.FreeHGlobal(buf);
        }
    }

    public static uint SendRaw(string printerName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            throw new Exception("cannot open printer '" + printerName + "' (Win32 error " + Marshal.GetLastWin32Error() + ")");

        try {
            EnsureReady(hPrinter);

            DOCINFO docInfo = new DOCINFO();
            docInfo.pDocName = "BuonApp Receipt";
            docInfo.pDataType = "RAW";

            uint jobId = StartDocPrinter(hPrinter, 1, docInfo);
            if (jobId == 0)
                throw new Exception("StartDocPrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");

            try {
                if (!StartPagePrinter(hPrinter))
                    throw new Exception("StartPagePrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");

                int written = 0;
                if (!WritePrinter(hPrinter, bytes, bytes.Length, out written))
                    throw new Exception("WritePrinter failed (Win32 error " + Marshal.GetLastWin32Error() + ")");
                if (written != bytes.Length)
                    throw new Exception("WritePrinter accepted " + written + " of " + bytes.Length + " bytes");

                EndPagePrinter(hPrinter);
            } finally {
                EndDocPrinter(hPrinter);
            }

            return jobId;
        } finally {
            ClosePrinter(hPrinter);
        }
    }
}
`;

// Delivered as -EncodedCommand rather than a .ps1: ExecutionPolicy governs script
// files only, and a GPO-set policy silently overrides -ExecutionPolicy Bypass, so
// a script file would fail on exactly the managed machines a POS runs on.
// The printer name and payload path travel in the child environment, so neither
// is ever parsed as script text.
const WINSPOOL_HELPER_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  $name = $env:FLO_PRINTER_NAME
  $file = $env:FLO_PRINT_FILE
  if ([string]::IsNullOrEmpty($name)) { throw 'no printer name supplied' }
  if ([string]::IsNullOrEmpty($file)) { throw 'no payload file supplied' }

  # Best-effort metadata for Tier-2 diagnostics. This is never included in the
  # anonymous telemetry payload and must not prevent the raw print attempt.
  try {
    $printerInfo = Get-CimInstance -ClassName Win32_Printer -Property Name,PrinterStatus,DriverName |
      Where-Object { $_.Name -eq $name } |
      Select-Object -First 1 Name,PrinterStatus,DriverName
    if ($printerInfo) {
      Write-Output ('FLO_PRINTER_INFO=' + ($printerInfo | ConvertTo-Json -Compress))
    }
  } catch { }

  Add-Type -TypeDefinition @'
${WINSPOOL_HELPER_SOURCE}
'@

  $bytes = [System.IO.File]::ReadAllBytes($file)
  $jobId = [FloRawPrinter]::SendRaw($name, $bytes)
  Write-Output ('FLO_JOB_ID=' + $jobId)
  exit 0
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

const execFileAsync = promisify(execFile);

function parseWindowsPrintOutput(output: unknown): Pick<DispatchResult, 'jobId' | 'driverName' | 'printerStatus'> {
  const outputLines = String(output || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const jobLine = outputLines.find((line) => line.startsWith('FLO_JOB_ID='));
  const infoLine = outputLines.find((line) => line.startsWith('FLO_PRINTER_INFO='));
  const parsed: Pick<DispatchResult, 'jobId' | 'driverName' | 'printerStatus'> = {};

  if (jobLine) {
    const jobId = Number(jobLine.slice('FLO_JOB_ID='.length));
    if (Number.isSafeInteger(jobId) && jobId > 0) parsed.jobId = jobId;
  }
  if (infoLine) {
    try {
      const info = JSON.parse(infoLine.slice('FLO_PRINTER_INFO='.length)) as { DriverName?: unknown; PrinterStatus?: unknown };
      if (typeof info.DriverName === 'string' && info.DriverName.trim()) parsed.driverName = info.DriverName.trim();
      if (typeof info.PrinterStatus === 'number') parsed.printerStatus = info.PrinterStatus;
    } catch { /* diagnostics metadata is best-effort */ }
  }
  return parsed;
}

async function printViaUSBWindows(data: Buffer, printerName?: string, signal?: AbortSignal): Promise<DispatchResult> {
  if (!printerName) {
    const detail = 'No Windows printer configured; refusing to guess a target';
    console.error(`[Printer] ${detail}`);
    return { ok: false, detail };
  }

  // %TEMP%, not C:\Windows\Temp — the latter is not writable by a standard user.
  const tmpFile = path.join(os.tmpdir(), `flo_print_${process.pid}_${Date.now()}.bin`);

  try {
    fs.writeFileSync(tmpFile, data);

    const encoded = Buffer.from(WINSPOOL_HELPER_SCRIPT, 'utf16le').toString('base64');

    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        encoding: 'utf8',
        timeout: 20000,
        signal,
        windowsHide: true,
        env: { ...process.env, FLO_PRINTER_NAME: printerName, FLO_PRINT_FILE: tmpFile },
      },
    );

    const metadata = parseWindowsPrintOutput(stdout);
    console.log(`[Printer] Windows raw print accepted for "${printerName}" (${String(stdout).trim()})`);
    return { ok: true, ...metadata };
  } catch (err: any) {
    const detail = String(err.stderr || err.message || '').trim();
    console.error(`[Printer] Windows raw print failed for "${printerName}": ${detail}`);
    return {
      ok: false,
      detail: detail || `Windows raw print failed for "${printerName}"`,
      failureClass: classifyPrintFailure(detail),
      platformErrorCode: extractPlatformErrorCode(detail),
      ...parseWindowsPrintOutput(err.stdout),
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

export function getPrinterStatus(): { connected: boolean; printer: any } {
  const printer = getPrinterConfig();
  return { connected: !!printer, printer };
}
