# Printer setup

BuonApp prints receipts and kitchen order tickets from the desktop app. Configure printers in **Settings → Printers**, then use **Test Print** before service.

## Connection types

| Type | Use it for | What you need |
| --- | --- | --- |
| Network | Receipt or kitchen printers on the local network | Printer IP address and port; most ESC/POS printers use port `9100` |
| USB / OS Queue | Direct USB printers and OS-managed printer queues | Direct USB connection or a configured OS print queue (Windows Spooler or CUPS) |
| WebUSB | A browser-connected printer | A compatible browser and a user-selected device; the browser sends the print bytes |

Set the paper width to match the printer: 58 mm or 80 mm. The first configured printer becomes the default; choose another default in Settings when a different printer should receive ordinary receipts. If no hardware printer is configured, BuonApp automatically falls back to system print when printing bills.

## Kitchen printing

BuonApp can print kitchen order tickets to the default printer or route items to configured kitchen stations. A station needs an active printer and the product categories it handles. Items without a matching station fall back to the default kitchen route.

Each send carries only the order rows that have not been to the kitchen yet, numbered as a sequential round on the ticket header. Adding a course to an open table and sending again prints that course alone, never the whole check a second time. Rows still waiting are marked in the table sheet, where **Send to kitchen** dispatches them. If a print fails, the rows stay queued so the send can be repeated.

Placing or extending an order sends that ticket on its own: it is the same gesture, not a separate preference. **KOT Ticket Printing** in Settings is the one switch, for businesses that print no kitchen tickets at all.

On the Server App (the handheld waiters carry), sending an order is itself the act of firing the ticket, the same as on the POS. A drink added to an open table from a handheld prints at the bar station and nowhere else. If the kitchen ticket fails to print, the waiter is told so explicitly: the order is already saved, and only the paper is missing.

KOT printing can be disabled for the business. When it is disabled, neither automatic nor manual KOT print requests are sent.

### What a kitchen ticket looks like

Tickets lead with the table in the largest type the paper allows, then the round number, then a single condensed line carrying the send time, the covers, and the station. Dishes follow with the quantity in its own column and the name in double height; add-ons are marked `+`, item notes `>>` and printed in bold. A thin rule separates one dish from the next, and where a station cooks more than one category the dishes are grouped under a labelled rule per category. The ticket closes with a line and piece count plus the order number, so the pass can check nothing is missing and the ticket can still be traced back to its order.

### Receipt language

Receipts render their labels from the store's UI language setting, in English or Italian; any other language falls back to English rather than printing a half-translated bill. The two core templates keep their own wording for the number line (`Invoice #` on classic, `Bill #` on compact).

### Accented characters

Printer profiles declare a `codePage` (WPC1252) so Western European text prints as written. WPC1252 matches Latin-1 except at `0x80`-`0x9F`, where it carries the euro sign and typographic punctuation; those are encoded from an explicit table, which is also what lets a currency symbol print instead of falling back to a three-letter code. Run **Test Print** before service: the test page includes an accent probe line and reports the code page in use. If those characters print as garbage or come out blank, the profile's code page does not match the hardware — report it, and in the meantime a profile with no declared code page transliterates accents to plain letters rather than dropping the line.

## Troubleshooting

### Quick checks

1. Use **Settings → Printers → Test Print** to verify printer connectivity before live service.
2. Ensure BuonApp's local API and network printers are confined to your private business network.

### Network printers

- Confirm BuonApp's machine can reach the printer on the trusted/local business network.
- Verify the printer's IP address has not changed (check your router's DHCP lease table or configure a static IP / DHCP reservation).
- Verify the configured port (default ESC/POS port is usually `9100`).

### Windows USB & spooler printers

BuonApp sends raw ESC/POS byte streams directly to the Windows print queue, bypassing the printer driver. This requires the queue's *Print Processor* to be set to `winprint` with datatype `RAW`.

Manufacturer driver packages (such as Epson APD or Star) often install GDI graphics drivers that register proprietary print processors or reject raw byte streams. If prints fail or print garbled output:

1. Right-click the printer in Windows → **Printer Properties → Advanced tab → Print Processor** → confirm it is set to `winprint` with datatype `RAW`.
2. If issues persist, reinstall the printer using Windows' built-in **"Generic / Text Only"** driver (or the manufacturer's dedicated raw/ESC-POS mode).
3. Re-select the printer in BuonApp's printer settings, as renaming or reinstalling changes the stored queue identifier.

### macOS and Linux (CUPS) printers

- If a printer was unplugged, the CUPS print queue may be placed in a disabled/paused state. Re-enable the queue in your operating system printer settings; BuonApp will resume sending print jobs once the queue is active.
- For Linux USB permissions, ensure your user account is in the `lp` group (`sudo usermod -aG lp $USER`). See [Linux installation and support](linux.md#printing) for more details.

### Bluetooth & OS-paired printers

BuonApp does not manage standalone Bluetooth RFCOMM transport or discovery. To use a Bluetooth receipt printer, pair the device in your operating system so it registers as an active printer queue (via CUPS on macOS/Linux or Windows Print Spooler). BuonApp will then detect and dispatch print jobs through that OS-managed queue.

### WebUSB printers

WebUSB printers are paired through the POS toolbar in a supported browser. The saved printer entry retains formatting preferences, but browser permissions control physical device access.

### Diagnostic logs

If printing still fails:
1. Open **Help → Open Logs Folder** (or check `main.log`).
2. Search for lines starting with `[Printer]` around the time of the failure to find the exact error code or stage.
3. If opening an issue, include the `[Printer]` log snippet, your OS, printer make/model, connection type, and paper width.

## API

The printer endpoints are documented in [API.md](API.md#printers). They cover configured printers, detection, supported profiles, test printing, receipt printing, and kitchen tickets.
