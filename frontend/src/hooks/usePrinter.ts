'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { printerService, type PrinterStatus, type PrinterInfo, type PrintMode } from '@/lib/printer/PrinterService';
import {
  buildClassicReceiptBytes,
  buildCompactReceiptBytes,
  type ReceiptOptions,
} from '@/lib/printer/receipt-encoder';
import { usePosSettingsStore } from '@/store/pos-settings';
import { buildKotBytes, type KotOptions } from '@/lib/printer/kot-encoder';
import type { PrintWarning } from '@/lib/printer/warnings';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Bill, Tenant, Order } from '@/lib/types';

export type { PrintWarning } from '@/lib/printer/warnings';

type PrintModeType = 'receipt' | 'kot';
type PaperWidth = 58 | 80;

/** Tenant fields a browser/thermal receipt needs for locale-correct rendering. */
type ReceiptTenant = Pick<
  Tenant,
  'business_name' | 'currency' | 'country' | 'timezone' | 'currency_display' | 'number_digits' | 'calendar'
>;

/** Outcome of a kitchen-ticket send. `printed: false` means there was nothing new to send. */
export interface KotSendResult {
  warnings: PrintWarning[];
  printed: boolean;
  /** Ticket round issued for this send. Only the backend path can assign one. */
  batch?: number;
  itemCount?: number;
  reason?: string;
}

/** Wire shape of POST /printers/print-kot. */
interface KotSendResponse {
  warnings?: PrintWarning[];
  printed?: boolean;
  batch?: number;
  item_count?: number;
  reason?: string;
}

export interface HardwarePrinter {
  id: string;
  name: string;
  connection_type: 'network' | 'usb' | 'webusb';
  ip_address?: string | null;
  port?: number | null;
  paper_width?: string | null;
  is_default: number;
}

interface PrinterState {
  status: PrinterStatus;
  deviceInfo: PrinterInfo | null;
  lastError: string | null;
  lastPrintedBytes: Uint8Array | null;
  printMode: PrintModeType;
  paperWidth: PaperWidth;
  printMethod: PrintMode;
  hardwarePrinter: HardwarePrinter | null;
  refreshHardwarePrinter: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printBill: (bill: Bill, tenant: ReceiptTenant, opts?: ReceiptOptions) => Promise<PrintWarning[]>;
  printKot: (order: Order, opts?: KotOptions) => Promise<KotSendResult>;
  setPrintMode: (mode: PrintModeType) => void;
  setPaperWidth: (width: PaperWidth) => void;
  setPrintMethod: (method: PrintMode) => void;
  clearError: () => void;
  downloadLastReceipt: () => void;
  copyLastReceiptHex: () => Promise<void>;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      deviceInfo: null,
      lastError: null,
      lastPrintedBytes: null,
      printMode: 'receipt',
      paperWidth: 58,
      printMethod: 'escpos',
      hardwarePrinter: null,

      refreshHardwarePrinter: async () => {
        try {
          const res = await api.get('/printers');
          const list: HardwarePrinter[] = res.data.printers || [];
          const defaultPrinter =
            list.find((p) => p.is_default === 1 && p.connection_type !== 'webusb') ||
            list.find((p) => p.connection_type !== 'webusb') ||
            null;
          set({ hardwarePrinter: defaultPrinter });
        } catch {
          set({ hardwarePrinter: null });
        }
      },

      connect: async () => {
        set({ lastError: null });
        try {
          await printerService.connect();
        } catch (err) {
          set({ lastError: (err as Error).message });
        }
      },

      disconnect: async () => {
        await printerService.disconnect();
      },

      printBill: async (bill, tenant, opts) => {
        set({ lastError: null });
        try {
          const {
            billTemplate,
            billTaxRegistrationNumber, billAddress, billPhone, billFooterMessage,
            billShowName, billShowAddress, billShowPhone, billShowTaxId,
            billShowCustomerName, billShowCustomerPhone, billShowTableNumber,
            printerPaperSize,
            printerUseUnicode,
            printerTrimDecimals,
          } = usePosSettingsStore.getState();

          const isReprint = opts?.isReprint ?? false;

          const executeBrowserPrint = async () => {
            const { printWebBill } = await import('@/lib/printer/web-print');
            await printWebBill(bill, tenant, {
              paperSize: printerPaperSize,
              includeTaxId: billShowTaxId,
              taxRegistrationNumber: billShowTaxId && billTaxRegistrationNumber ? billTaxRegistrationNumber : undefined,
              address: billShowAddress && billAddress ? billAddress : undefined,
              phone: billShowPhone && billPhone ? billPhone : undefined,
              footerNote: billFooterMessage || undefined,
              businessName: tenant.business_name,
              showBusinessName: billShowName,
              showCustomerName: billShowCustomerName,
              showCustomerPhone: billShowCustomerPhone,
              showTableNumber: billShowTableNumber,
              useUnicode: printerUseUnicode,
              isReprint,
              trimDecimals: printerTrimDecimals,
            });
            return [] as PrintWarning[];
          };

          const hw = get().hardwarePrinter;
          if (hw && get().printMethod === 'escpos') {
            try {
              const response = await api.post<{ warnings?: PrintWarning[] }>('/printers/print-bill', { billId: bill.id, useUnicode: printerUseUnicode, isReprint });
              return response.data.warnings || [];
            } catch (err: unknown) {
              const e = err as { response?: { data?: { error?: string } }; message?: string };
              const errorMsg = e.response?.data?.error || e.message || 'Print failed';
              if (errorMsg.includes('No default printer configured')) {
                toast('No thermal printer configured — printing via system print', { icon: 'ℹ️' });
                return await executeBrowserPrint();
              }
              throw new Error(errorMsg);
            }
          }

          if (get().printMethod === 'browser' || (!hw && !printerService.isConnected && get().printMethod === 'escpos')) {
            if (!hw && !printerService.isConnected && get().printMethod === 'escpos') {
              toast('No thermal printer configured — printing via system print', { icon: 'ℹ️' });
            }
            return await executeBrowserPrint();
          }

          // ESC/POS thermal path
          const configuredPaperWidth: PaperWidth = printerPaperSize === 'thermal80' ? 80 : 58;
          const builderOpts: ReceiptOptions = {
            ...opts,
            paperWidth: opts?.paperWidth ?? configuredPaperWidth,
            taxRegistrationNumber: billShowTaxId && billTaxRegistrationNumber ? billTaxRegistrationNumber : undefined,
            address: billShowAddress && billAddress ? billAddress : undefined,
            phone: billShowPhone && billPhone ? billPhone : undefined,
            footerNote: billFooterMessage || undefined,
            showBusinessName: billShowName,
            showCustomerName: billShowCustomerName,
            showCustomerPhone: billShowCustomerPhone,
            showTableNumber: billShowTableNumber,
            useUnicode: printerUseUnicode,
            isReprint,
            trimDecimals: printerTrimDecimals,
          };

          const warnings: PrintWarning[] = [];
          let bytes: Uint8Array;
          if (billTemplate === 'compact') {
            bytes = buildCompactReceiptBytes(bill, tenant, builderOpts, warnings);
          } else {
            bytes = buildClassicReceiptBytes(bill, tenant, builderOpts, warnings);
          }

          set({ lastPrintedBytes: bytes });
          await printerService.print(bytes);
          return warnings;
        } catch (err) {
          set({ lastError: (err as Error).message });
          throw err;
        }
      },

      printKot: async (order, opts) => {
        set({ lastError: null });
        // Single choke point for every KOT print path (automatic and manual):
        // when kot_printing_enabled is off, no KOT print command may ever go
        // out (issue #133). It is now the only switch — sending a ticket is
        // intrinsic to writing the order, not a separate preference.
        const { kotPrintingEnabled, printerUseUnicode } = usePosSettingsStore.getState();
        if (!kotPrintingEnabled) {
          const err = new Error('KOT printing is disabled for this business');
          set({ lastError: err.message });
          throw err;
        }
        try {
          const hw = get().hardwarePrinter;
          if (hw && get().printMethod === 'escpos') {
            try {
              // The backend owns the round ledger: it picks the rows that have
              // never been sent, stamps them with the next ticket number and
              // routes them to the stations. It answers printed:false when
              // there is nothing new, which is a no-op, not a failure.
              const response = await api.post<KotSendResponse>('/printers/print-kot', {
                orderId: order.id,
                useUnicode: printerUseUnicode,
                ...(opts?.batch !== undefined ? { batch: opts.batch } : {}),
              });
              const data = response.data || {};
              return {
                warnings: data.warnings || [],
                printed: data.printed !== false,
                batch: data.batch,
                itemCount: data.item_count,
                reason: data.reason,
              };
            } catch (err: unknown) {
              const e = err as { response?: { data?: { error?: string } }; message?: string };
              throw new Error(e.response?.data?.error || e.message || 'KOT print failed');
            }
          }

          // Client-side rendering (WebUSB / browser dialog). There is no
          // backend round-trip here, so nothing can be stamped as sent —
          // the ticket still narrows to the rows that are waiting, but the
          // round number needs a configured hardware printer.
          const pendingItems = (order.items || []).filter(
            (item) => item.kot_batch === null || item.kot_batch === undefined,
          );
          const orderToPrint = order.items && pendingItems.length > 0
            ? { ...order, items: pendingItems }
            : order;
          const { paperWidth } = get();
          const warnings: PrintWarning[] = [];
          const bytes = buildKotBytes(orderToPrint, { ...opts, paperWidth }, warnings);
          set({ lastPrintedBytes: bytes });

          if (get().printMethod === 'escpos') {
            await printerService.print(bytes);
          } else {
            const paperWidth = get().paperWidth || 80;
            const html = `<html><body style="font-family:monospace;white-space:pre;padding:10px;">${new TextDecoder().decode(bytes)}</body></html>`;
            await printerService.printViaBrowser(html, paperWidth);
          }
          return { warnings, printed: true };
        } catch (err) {
          set({ lastError: (err as Error).message });
          throw err;
        }
      },

      setPrintMode: (mode) => set({ printMode: mode }),
      setPaperWidth: (width) => set({ paperWidth: width }),
      setPrintMethod: (method) => {
        printerService.setPrintMode(method);
        set({ printMethod: method, lastError: null });
      },

      clearError: () => set({ lastError: null }),

      downloadLastReceipt: () => {
        const bytes = get().lastPrintedBytes;
        if (!bytes) return;
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'receipt.bin';
        a.click();
        URL.revokeObjectURL(url);
      },

      copyLastReceiptHex: async () => {
        const bytes = get().lastPrintedBytes;
        if (!bytes) return;
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');
        await navigator.clipboard.writeText(hex);
      },
    }),
    {
      name: 'flo-printer-settings',
      partialize: (state) => ({ printMode: state.printMode, paperWidth: state.paperWidth, printMethod: state.printMethod }),
      // v2: the tax-invoice print mode is gone with the taxation module.
      // Browsers that saved it (or its older 'gst' spelling) fall back to the
      // plain receipt instead of restoring a mode nothing can print.
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { printMode?: string };
        if (state.printMode === 'gst' || state.printMode === 'tax') {
          state.printMode = 'receipt';
        }
        return state as unknown as PrinterState;
      },
    }
  )
);

export function usePrinterStatusSync(): void {
  const store = usePrinterStore();

  useEffect(() => {
    usePrinterStore.setState({
      status: printerService.status,
      deviceInfo: printerService.deviceInfo,
    });

    store.refreshHardwarePrinter();

    const unsub = printerService.onStatusChange((status, info) => {
      usePrinterStore.setState({
        status,
        deviceInfo: info ?? printerService.deviceInfo,
      });
    });

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
