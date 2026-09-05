/**
 * Service runs, on the interface side — which wave of the meal a dish leaves
 * the kitchen in (docs/coperto-e-menu-fisso.md, and the printing rules in
 * `main/services/service-runs.ts`).
 *
 * The number is only ever a hint to the kitchen: nothing here prices anything,
 * and a row on the wrong run costs nobody money. That is why an unreadable
 * value falls back to the first run instead of being refused — the same rule
 * the backend follows, so the two never disagree about what a row is on.
 */

export const MAX_SERVICE_RUNS = 9;
export const DEFAULT_SERVICE_RUN = 1;

/** 1..9, for a picker. */
export const SERVICE_RUNS: number[] = Array.from({ length: MAX_SERVICE_RUNS }, (_, index) => index + 1);

/** The run a row is on, whatever the row actually carries. */
export function serviceRunOf(item: { service_run?: number | null } | null | undefined): number {
  const run = Number(item?.service_run);
  if (!Number.isInteger(run) || run < 1 || run > MAX_SERVICE_RUNS) return DEFAULT_SERVICE_RUN;
  return run;
}

/**
 * Whether a run chip is worth showing at all.
 *
 * A house that never touches a run has everything on the first one, and a
 * column of identical "1ª" chips is noise. The chip appears once anything on
 * the check is somewhere else — which is exactly when it starts meaning
 * something.
 */
export function runsAreInPlay(items: { service_run?: number | null }[]): boolean {
  return items.some((item) => serviceRunOf(item) !== DEFAULT_SERVICE_RUN);
}
