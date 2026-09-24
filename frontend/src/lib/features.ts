/**
 * Features whose code ships but which the app does not offer.
 *
 * WhatsApp is switched off: the bill shared through a wa.me link, and the
 * connected phone that sends it — the /whatsapp page, the WhatsApp tab and the
 * sharing toggle in Settings, the buttons in the order panel and after a
 * payment, the WhatsApp mode of the print test page. Nobody here used it and
 * it was never tried in service, so the code stays for the day it is wanted
 * instead of being deleted. With this off no screen shows a way in, and
 * nothing asks the backend about it.
 *
 * The backend has the same switch in `main/features.ts`, which leaves the
 * routes unmounted and the service stopped. Turning WhatsApp back on is both
 * switches and a rebuild.
 */
export const WHATSAPP_AVAILABLE: boolean = false;
