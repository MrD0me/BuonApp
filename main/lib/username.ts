/**
 * Who signs in, and by what name.
 *
 * BuonApp runs on the restaurant's own PC and never sends mail, so asking staff
 * for an email address to sign in only ever collected invented ones. Every
 * login asks for a username instead, and migration v96 turned each account's
 * email into one. Kept free of `main/db.ts` so the migration, the auth routes
 * and the restore paths share one rule without an import cycle: the functions
 * that touch the database take it as an argument. The forms repeat the rule in
 * `frontend/src/lib/username.ts`, and `tests/usernames.test.ts` keeps the two
 * in step.
 */
import type Database from 'better-sqlite3';

/** A username somebody picks now: at least this long. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

/** Nothing longer is worth looking at: a name, an email, a request body field. */
const MAX_INPUT_LENGTH = 256;

/**
 * Plain letters and digits, with dot, dash and underscore in between. Latin
 * letters only: a waiter's phone and the till must type the same name, and an
 * accent or a keyboard layout should not be what tells them apart.
 */
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const NOT_ALLOWED = /[^a-z0-9._-]+/g;
const COMBINING_MARKS = /\p{M}+/gu;
const SEPARATORS = new Set(['.', '_', '-']);

/**
 * The one form a username is stored and compared in. Case never matters, and
 * neither do accents — "Niccolò" at the till and "niccolo" on the handheld are
 * the same person — so both are folded here, and the UNIQUE column does the rest.
 */
export function normalizeUsername(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value)
    .slice(0, MAX_INPUT_LENGTH)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .trim()
    .toLowerCase();
}

/**
 * Whether a normalized value can be a username at all. Accounts that existed
 * before usernames keep exactly the part of their email before the `@`, so this
 * accepts a single character; a username chosen from now on must also pass
 * {@link isValidUsername}.
 */
export function isUsernameShape(username: string): boolean {
  // Bounded before the pattern runs, like every check on a request body.
  return username.length >= 1
    && username.length <= USERNAME_MAX_LENGTH
    && USERNAME_PATTERN.test(username);
}

/** Whether a normalized value is acceptable as a newly chosen username. */
export function isValidUsername(username: string): boolean {
  return username.length >= USERNAME_MIN_LENGTH && isUsernameShape(username);
}

function trimSeparators(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && SEPARATORS.has(value[start])) start++;
  while (end > start && SEPARATORS.has(value[end - 1])) end--;
  return value.slice(start, end);
}

/**
 * Shapes any text — the part of an old email before the `@`, a person's name —
 * like a username: each run of characters a username cannot hold becomes one
 * dot ("Mario Rossi" → "mario.rossi", "o'brien" → "o.brien"), and the ends lose
 * their punctuation. Empty when nothing usable is left. A value that already
 * has the shape of a username comes back unchanged.
 */
export function usernameBase(text: unknown): string {
  const shaped = trimSeparators(normalizeUsername(text).replace(NOT_ALLOWED, '.'));
  return trimSeparators(shaped.slice(0, USERNAME_MAX_LENGTH));
}

/**
 * What an account that used to sign in with `legacy` — an email, or whatever
 * somebody typed into the old optional email field — is called now: the part
 * before the `@`, otherwise its name, otherwise its role. A value that already
 * is a username stays as it is.
 */
export function usernameFromLegacy(legacy: unknown, name: unknown, role: unknown): string {
  const value = normalizeUsername(legacy);
  if (isUsernameShape(value)) return value;
  const at = value.indexOf('@');
  return usernameBase(at >= 0 ? value.slice(0, at) : value) || usernameFromName(name, role);
}

/** The username a name suggests ("Mario Rossi" → "mario.rossi"), or the role's, or `user`. */
export function usernameFromName(name: unknown, role?: unknown): string {
  return usernameBase(name) || usernameBase(role) || 'user';
}

/**
 * `base` if nobody holds it, otherwise the first free of mario2, mario3, …
 * still within the length limit. A base that already ends in a digit takes a
 * dot first, so a second "cassa1" is "cassa1.2" and not a "cassa12".
 */
export function pickUniqueUsername(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = String(n);
    const head = trimSeparators(base.slice(0, USERNAME_MAX_LENGTH - suffix.length - 1));
    const candidate = /[0-9]$/.test(head) ? `${head}.${suffix}` : `${head}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Every username in use, for picking one nobody holds. */
export function takenUsernames(db: Database.Database): Set<string> {
  return new Set(
    (db.prepare("SELECT username FROM users WHERE username IS NOT NULL AND username <> ''").all() as { username: string }[])
      .map((row) => row.username),
  );
}

type LegacyLoginRow = { id: string; name: string | null; role: string | null; username: string | null };

/**
 * Migration v96: every account gets its username from what it signed in with.
 *
 * Two passes, in order of who matters most — owners who can still sign in,
 * then the other active accounts, then the inactive ones — so a clash costs
 * the "2" to whoever matters least. First every account claims the name it
 * wants: its value when that already is a username (somebody who typed a plain
 * name into the old optional email field, or every row when a rewound database
 * replays v96, which must then change nothing), otherwise the part of its
 * email before the `@`, its name, its role. Then the accounts that lost a clash
 * take a numbered one. Changed rows are cleared before any is written back,
 * so no two rows ever hold the same username halfway through.
 *
 * Returns how many accounts ended up with a different value.
 */
export function convertLegacyUsernames(db: Database.Database): number {
  const rows = db.prepare(`
    SELECT id, name, role, username FROM users
    ORDER BY (is_active = 1 AND role = 'owner') DESC, (is_active = 1) DESC, created_at, id
  `).all() as LegacyLoginRow[];

  const taken = new Set<string>();
  const chosen = new Map<string, string>();
  const wanted = new Map(rows.map((row) => [row.id, usernameFromLegacy(row.username, row.name, row.role)]));
  for (const row of rows) {
    const username = wanted.get(row.id)!;
    if (taken.has(username)) continue;
    taken.add(username);
    chosen.set(row.id, username);
  }
  for (const row of rows) {
    if (chosen.has(row.id)) continue;
    const username = pickUniqueUsername(wanted.get(row.id)!, taken);
    taken.add(username);
    chosen.set(row.id, username);
  }

  const changed = rows.filter((row) => row.username !== chosen.get(row.id));
  const clear = db.prepare('UPDATE users SET username = NULL WHERE id = ?');
  const write = db.prepare('UPDATE users SET username = ? WHERE id = ?');
  for (const row of changed) clear.run(row.id);
  for (const row of changed) write.run(chosen.get(row.id), row.id);
  return changed.length;
}

/**
 * Gives every account without a username one, from its name. A restore can
 * leave such rows behind — a backup from before v96 has no username column,
 * and a clash with a current account is settled by clearing the other row's —
 * and so can an imported placeholder. An account nobody can name is one nobody
 * can sign in to once it is reactivated. Never touches an existing username.
 *
 * Returns how many accounts were given one.
 */
export function assignMissingUsernames(db: Database.Database): number {
  const taken = takenUsernames(db);
  const missing = db.prepare(`
    SELECT id, name, role FROM users
    WHERE username IS NULL OR username = ''
    ORDER BY (is_active = 1 AND role = 'owner') DESC, (is_active = 1) DESC, created_at, id
  `).all() as { id: string; name: string | null; role: string | null }[];
  const assign = db.prepare('UPDATE users SET username = ? WHERE id = ?');
  for (const row of missing) {
    const username = pickUniqueUsername(usernameFromName(row.name, row.role), taken);
    taken.add(username);
    assign.run(username, row.id);
  }
  return missing.length;
}
