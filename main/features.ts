/**
 * Features whose code ships but which the app does not offer.
 *
 * WhatsApp is switched off. Nobody here used it and it was never tried in
 * service, so it is kept for the day it is wanted instead of being deleted.
 * With this off its routes are not mounted — `/api/whatsapp` answers 404 like
 * any route that does not exist — and its service never starts, whatever
 * `whatsapp_enabled` says in the settings table, so nothing reaches
 * WhatsApp's servers. Its tables, its settings and any saved session stay as
 * they are.
 *
 * The frontend has the same switch in `frontend/src/lib/features.ts`, which
 * hides every way in. Turning WhatsApp back on is both switches and a rebuild.
 */
export const WHATSAPP_AVAILABLE: boolean = false;
