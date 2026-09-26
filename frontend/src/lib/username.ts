/**
 * The username rule, as the sign-in and staff forms check it before sending.
 *
 * Mirrors `main/lib/username.ts`: the backend has the last word, this side only
 * answers before the round trip. `tests/usernames.test.ts` keeps the two in step.
 */

/** A username somebody picks now: at least this long. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

const MAX_INPUT_LENGTH = 256;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
// Built at runtime: the frontend compiles for ES2017, which has no \p{…} in
// regex literals, while every browser that runs the app has it.
const COMBINING_MARKS = new RegExp('\\p{M}+', 'gu');

/** Lowercase, accents folded, no surrounding spaces: "Niccolò " signs in as "niccolo". */
export function normalizeUsername(value: string): string {
  return value
    .slice(0, MAX_INPUT_LENGTH)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .toLowerCase();
}

/**
 * Whether a normalized value can be a username at all. Accounts that existed
 * before usernames keep exactly the part of their email before the `@`, which
 * can be a single letter.
 */
export function isUsernameShape(username: string): boolean {
  return username.length >= 1
    && username.length <= USERNAME_MAX_LENGTH
    && USERNAME_PATTERN.test(username);
}

/** Whether a normalized value is acceptable as a newly chosen username. */
export function isValidUsername(username: string): boolean {
  return username.length >= USERNAME_MIN_LENGTH && isUsernameShape(username);
}

/**
 * Somebody typing what they signed in with before usernames. An `@` is never
 * part of one, so the form can say what changed instead of sending it off to
 * come back "invalid credentials" and count as a failed attempt.
 */
export function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}
