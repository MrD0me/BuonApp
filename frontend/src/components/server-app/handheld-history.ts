/**
 * The handheld's screens in the browser's history, so «back» stays in the app.
 *
 * The screens were React state and the address was only ever replaced: the
 * Android back gesture — a swipe from the edge of the screen, made by
 * accident as often as on purpose — left the page altogether, and a ticket
 * half written went with it. Now each screen a waiter taps into adds an
 * entry, and back goes to the screen before: the ticket closes onto the menu,
 * the menu onto the table, the table onto the floor; only from the floor does
 * back leave.
 *
 * Two rules the browser sets:
 *
 * - Entries are added only from a tap. Chrome skips, on the way back, entries
 *   a page added without one, and a back that skipped the screen it should
 *   have stopped at would be worse than none.
 * - Entries go through Next's own `pushState`, which copies its router marker
 *   (`__NA`) into them. An entry without it makes Next reload the page on the
 *   way back (next/dist/client/components/app-router.js, onPopState).
 *
 * The windows over a screen — a dish's options, a fixed menu — are not in the
 * history: a back gesture with one open goes back a screen, and a menu window
 * with dishes counted in it comes back with them the next time the menu is
 * open (the draft keeps it, handheld-draft.ts).
 */

export type HandheldScreen = 'sala' | 'table' | 'ordina' | 'ticket';

export interface HandheldPlace {
  screen: HandheldScreen;
  tableId: string | null;
}

interface HandheldEntry extends HandheldPlace {
  /** How many entries this page has added below this one: 0 is the floor the page opened on. */
  depth: number;
}

const KEY = 'buonappHandheld';

function entryOf(state: unknown): HandheldEntry | null {
  const entry = (state as Record<string, unknown> | null)?.[KEY] as Partial<HandheldEntry> | undefined;
  if (!entry || typeof entry.screen !== 'string' || typeof entry.depth !== 'number') return null;
  return { screen: entry.screen as HandheldScreen, tableId: entry.tableId ?? null, depth: entry.depth };
}

/** Where a history entry puts the handheld; the page's own first entry is the floor. */
export function placeOf(state: unknown): HandheldPlace {
  const entry = entryOf(state);
  return entry ? { screen: entry.screen, tableId: entry.tableId } : { screen: 'sala', tableId: null };
}

/** How many screens deep the current entry is. */
export function currentDepth(): number {
  if (typeof window === 'undefined') return 0;
  return entryOf(window.history.state)?.depth ?? 0;
}

function addressFor(place: HandheldPlace): string {
  const path = window.location.pathname;
  return place.tableId ? `${path}?table=${encodeURIComponent(place.tableId)}` : path;
}

/** A screen the waiter tapped into: one entry more. Call it from the tap. */
export function enterScreen(place: HandheldPlace): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({ [KEY]: { ...place, depth: currentDepth() + 1 } }, '', addressFor(place));
}

/**
 * Back to `place`, a screen this page entered earlier: through the history
 * when the entries are there — the browser then reports it, and the caller
 * sets the screen on that report — and false when they are not (the page
 * was opened on a table by a link), for the caller to set it itself.
 */
export function returnTo(place: HandheldPlace, depthOfPlace: number): boolean {
  if (typeof window === 'undefined') return false;
  const steps = currentDepth() - depthOfPlace;
  if (steps <= 0) {
    window.history.replaceState({ [KEY]: { ...place, depth: currentDepth() } }, '', addressFor(place));
    return false;
  }
  window.history.go(-steps);
  return true;
}

/** The depth a screen sits at when entered the usual way: floor, table, menu, ticket. */
export const SCREEN_DEPTH: Record<HandheldScreen, number> = { sala: 0, table: 1, ordina: 2, ticket: 3 };
