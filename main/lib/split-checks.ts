/**
 * Splitting a check is parked.
 *
 * The code stays — the route, the allocation, the merge back, the migrations
 * that repaired the checks earlier versions wrote — because none of it is
 * wrong and throwing it away would cost more than keeping it. What stops is
 * offering it in a dining room.
 *
 * The decision was the owner's, on 2026-09-04, after a split came out short:
 * four shares on a table of 112,00 adding up to 92,00. That particular cause
 * was a bill whose subtotal had not followed a late dish, and it is fixed —
 * but it was the fourth defect to surface through splitting, after shares
 * worth nothing stranding an order (v85), the cover being divided by what each
 * guest ate instead of per head (v90), and the order panel reading the first
 * guest's share as the whole table's totals.
 *
 * They surface there because splitting is the one operation that reads every
 * stored figure at once and makes them agree: it is the canary, rarely the
 * cause. Which is also why parking it is a choice and not a fix — the wrong
 * figures would still be written, just not shown.
 *
 * **To bring it back:** flip DEFAULT_AVAILABILITY to `true`, and drop the
 * greyed-out note from the split-checks block in
 * `frontend/src/components/settings/PaymentMethodsSettings.tsx`. Nothing else
 * has to be undone: the stored `split_checks_enabled` preference was never
 * overwritten, so each house gets its own choice back.
 */

const DEFAULT_AVAILABILITY = false;

let available = DEFAULT_AVAILABILITY;

/** Whether this build offers splitting at all. */
export function splitChecksAvailable(): boolean {
  return available;
}

/**
 * Test-only. The split-check suites keep the parked feature covered by
 * switching it on for themselves, so it stays ready instead of rotting
 * unexercised until somebody unparks it. Deliberately not driven by an
 * environment variable: nothing outside a test file should be able to reach
 * this.
 */
export function setSplitChecksAvailableForTests(value: boolean): void {
  available = value;
}

/** Whether the house wants it is a setting; whether it exists at all is not. */
export const SPLIT_CHECKS_SETTING_KEY = 'split_checks_enabled';

/** Told to a caller that asks for a split while the feature is parked. */
export const SPLIT_CHECKS_UNAVAILABLE_CODE = 'split_checks_unavailable';
