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

/**
 * Which screen sits at each depth of the history this page has made. The
 * entries themselves cannot be read back from the page, only the current
 * one, and «back to the table» has to know how many steps the table is:
 * two from the ticket when the floor came first, one when the page was opened
 * on the table by a link.
 */
const placesByDepth: HandheldPlace[] = [{ screen: 'sala', tableId: null }];

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

/**
 * The screen the page opened on, when it is not the floor: a link to a
 * table, or a ticket put back after a reload. The entry the page already has
 * is marked as that screen, so a back that comes down to it lands there and
 * not on the floor. Replacing needs no tap.
 */
export function markCurrent(place: HandheldPlace): void {
  if (typeof window === 'undefined') return;
  const depth = currentDepth();
  placesByDepth[depth] = place;
  window.history.replaceState({ [KEY]: { ...place, depth } }, '', addressFor(place));
}

/** A screen the waiter tapped into: one entry more. Call it from the tap. */
export function enterScreen(place: HandheldPlace): void {
  if (typeof window === 'undefined') return;
  const depth = currentDepth() + 1;
  // A new screen ends whatever lay ahead of the current one.
  placesByDepth.length = depth;
  placesByDepth[depth] = place;
  window.history.pushState({ [KEY]: { ...place, depth } }, '', addressFor(place));
}

/**
 * Back to `place`, a screen this page entered earlier: through the history
 * to the nearest entry below this one that shows it — the browser then
 * reports the move, and the caller's handler sets the same screen again — and
 * false when there is none (the page opened somewhere else), after marking
 * the current entry as that screen, for the caller to set it itself.
 */
export function returnTo(place: HandheldPlace): boolean {
  if (typeof window === 'undefined') return false;
  const depth = currentDepth();
  for (let below = depth - 1; below >= 0; below -= 1) {
    const known = placesByDepth[below];
    if (!known || known.screen !== place.screen) continue;
    if (place.tableId !== null && known.tableId !== null && known.tableId !== place.tableId) continue;
    window.history.go(below - depth);
    return true;
  }
  markCurrent(place);
  return false;
}
