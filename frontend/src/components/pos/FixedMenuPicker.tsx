'use client';

import { useMemo, useState } from 'react';
import { MessageSquarePlus, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { FixedMenuSelection, Product } from '@/lib/types';
import {
  courseCapacity, courseChoices, courseSurcharge, missingRequiredCourses, portionsOf, selectionSurcharge, tallySelection,
} from '@/lib/fixed-menu';

/**
 * Taking a fixed menu the way the floor writes it on paper
 * (docs/coperto-e-menu-fisso.md): how many menus, then how many of each dish,
 * course by course — three lasagne, two carbonara — without asking every
 * guest for their whole dinner in turn. The dishes belong to the table, not
 * to a guest.
 *
 * Props in, callback out, and no API client of its own — the same shape as
 * AddonModal. That is on purpose: the handheld app composes orders through its
 * own axios instance, and this window mounts there unchanged. The catalogue
 * arrives as a prop; nothing here fetches.
 *
 * How many menus is asked every time and never guessed: at a table where some
 * take the menu and the others order from the card, a number that started
 * from the covers would charge menus nobody took the evening somebody forgot
 * to lower it. It is one "− 4 +" and the number can be typed; the row of
 * numbered chips it replaced, with a lone plus at the end, read as a stepper
 * with its minus missing.
 *
 * Every count on this screen counts plates. A course says "3 di 8": three of
 * the eight plates those menus are owed. A dish says how many of it, the ones
 * carrying a note included — a note does not make a second dish, it marks one
 * of the plates already counted.
 *
 * An unfinished menu is allowed out of here. The table orders the starters and
 * decides the main over them, and refusing the menu until every course is
 * filled meant the floor could not take the order it was being given. What is
 * missing is said in amber and asked for again on the check; it never stops
 * the order. Too many is another thing: nine mains on eight menus is a
 * mis-ring, and the ninth is ordered from the card.
 *
 * The wave a dish goes out in is not asked here. A menu is a running order —
 * starter, first, second — and every plate of a course goes out on the wave
 * its category gives it; moving one is done from the check, on the rare
 * evening that is wanted at all.
 */
interface Props {
  menu: Product;
  products: Product[];
  onAdd: (menu: Product, menus: number, selection: FixedMenuSelection) => void;
  onClose: () => void;
  initialSelection?: FixedMenuSelection;
  /** How many menus the line already feeds — a cart line being edited, or a line on the check. */
  initialMenus?: number;
  /** The table's covers, said under the count so the floor sees what it is aiming at. */
  covers?: number;
  mode?: 'add' | 'edit' | 'fill';
  /** Show one course only — the one the floor tapped on the check. */
  restrictToCourseId?: string;
}

/**
 * One counted entry: a dish's plain portions, or a single one with its note.
 *
 * A noted portion is always one plate — "senza besciamella" is about that
 * plate and no other — so it is a line of its own with a count of one.
 */
interface Tally {
  key: string;
  course_id: string;
  product_id: string;
  quantity: number;
  note: string;
  /** Carries a note of its own and is drawn under its dish; the plain count is the dish row itself. */
  own: boolean;
}

let tallyKeys = 0;
const nextTallyKey = () => `tally-${++tallyKeys}`;

const MAX_MENUS = 99;
const NOTE_LENGTH = 100;

export default function FixedMenuPicker({
  menu, products, onAdd, onClose,
  initialSelection = [], initialMenus, covers, mode = 'add', restrictToCourseId,
}: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();

  // A course read back off the check is a row per portion; the window counts.
  // The wave each row goes out in comes back with it and is left alone: it is
  // not a choice this window makes, so it is not one it counts by either.
  const [tallies, setTallies] = useState<Tally[]>(() => tallySelection(
    initialSelection.map((choice) => ({
      course_id: choice.course_id,
      product_id: choice.product_id,
      quantity: choice.quantity,
      ...(choice.note ? { note: choice.note } : {}),
    })),
  ).flatMap((entry): Tally[] => {
    const shared = { course_id: entry.course_id, product_id: entry.product_id };
    const portions = portionsOf(entry);
    const note = (entry.note || '').trim();
    return note
      ? Array.from({ length: portions }, () => ({ key: nextTallyKey(), ...shared, quantity: 1, note, own: true }))
      : [{ key: nextTallyKey(), ...shared, quantity: portions, note: '', own: false }];
  }));
  const [menus, setMenus] = useState<number | null>(
    mode === 'add' ? null : Math.max(1, Math.floor(Number(initialMenus)) || 1),
  );

  const courses = useMemo(
    () => [...(menu.courses || [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .filter((course) => !restrictToCourseId || course.id === restrictToCourseId),
    [menu.courses, restrictToCourseId],
  );

  const selection: FixedMenuSelection = tallySelection(tallies.filter((entry) => entry.quantity > 0).map((entry) => ({
    course_id: entry.course_id,
    product_id: entry.product_id,
    quantity: entry.quantity,
    ...(entry.note.trim() ? { note: entry.note.trim().slice(0, NOTE_LENGTH) } : {}),
  })));

  const heldIn = (entries: Tally[], courseId: string) => entries
    .filter((entry) => entry.course_id === courseId)
    .reduce((total, entry) => total + entry.quantity, 0);
  const countOfCourse = (courseId: string) => heldIn(tallies, courseId);
  // Until the count is given there is no ceiling to hold the courses to; the
  // floor may well start from the dishes.
  const capacityOf = (maxChoices: number) => (menus === null ? Infinity : courseCapacity({ max_choices: maxChoices }, menus));
  // Asked of the state being updated, not of the last render: two taps land
  // before the screen redraws, and the second must still see the first.
  const roomIn = (entries: Tally[], courseId: string, maxChoices: number) => heldIn(entries, courseId) < capacityOf(maxChoices);

  const surcharge = selectionSurcharge(menu, selection);
  const lineTotal = (Number(menu.price) || 0) * (menus ?? 0) + surcharge;
  const overfull = courses.filter((course) => countOfCourse(course.id) > capacityOf(course.max_choices));
  const missing = menus === null ? [] : missingRequiredCourses(menu, selection, menus)
    .filter((course) => !restrictToCourseId || course.id === restrictToCourseId);
  const canSave = menus !== null && overfull.length === 0;

  const isPlain = (entry: Tally, courseId: string, productId: string) => (
    !entry.own && entry.course_id === courseId && entry.product_id === productId
  );

  /** One more portion of a dish, on its plain count. */
  const addOne = (courseId: string, productId: string, maxChoices: number) => {
    setTallies((current) => {
      if (!roomIn(current, courseId, maxChoices)) return current;
      const plain = current.find((entry) => isPlain(entry, courseId, productId));
      if (plain) return current.map((entry) => (entry === plain ? { ...entry, quantity: entry.quantity + 1 } : entry));
      return [...current, { key: nextTallyKey(), course_id: courseId, product_id: productId, quantity: 1, note: '', own: false }];
    });
  };

  /** One portion fewer: a plain one while there is one, then the last with a note of its own. */
  const removeOne = (courseId: string, productId: string) => {
    setTallies((current) => {
      const plain = current.find((entry) => isPlain(entry, courseId, productId) && entry.quantity > 0);
      const target = plain ?? [...current].reverse().find((entry) => (
        entry.own && entry.course_id === courseId && entry.product_id === productId && entry.quantity > 0
      ));
      if (!target) return current;
      return current
        .map((entry) => (entry === target ? { ...entry, quantity: entry.quantity - 1 } : entry))
        .filter((entry) => entry.quantity > 0);
    });
  };

  /**
   * Marks one of the plates already counted: it leaves the plain count for a
   * line of its own, so the dish total does not move. Where every plate of
   * the dish carries a note already it is one more, if the course has room.
   */
  const noteOne = (courseId: string, productId: string, maxChoices: number) => {
    setTallies((current) => {
      const plain = current.find((entry) => isPlain(entry, courseId, productId) && entry.quantity > 0);
      if (!plain && !roomIn(current, courseId, maxChoices)) return current;
      return [
        ...current
          .map((entry) => (entry === plain ? { ...entry, quantity: entry.quantity - 1 } : entry))
          .filter((entry) => entry.quantity > 0),
        { key: nextTallyKey(), course_id: courseId, product_id: productId, quantity: 1, note: '', own: true },
      ];
    });
  };

  const amendNote = (key: string, note: string) => {
    setTallies((current) => current.map((entry) => (entry.key === key ? { ...entry, note } : entry)));
  };

  /** The note goes, the plate stays: it goes back into the plain count. */
  const dropNote = (key: string) => {
    setTallies((current) => {
      const noted = current.find((entry) => entry.key === key);
      if (!noted) return current;
      const plain = current.find((entry) => isPlain(entry, noted.course_id, noted.product_id));
      const kept = current
        .filter((entry) => entry.key !== key)
        .map((entry) => (entry === plain ? { ...entry, quantity: entry.quantity + noted.quantity } : entry));
      return plain ? kept : [...kept, { ...noted, key: nextTallyKey(), note: '', own: false }];
    });
  };

  /** Only digits, and an empty box means the count is still unanswered. */
  const typeCount = (typed: string) => {
    const digits = typed.replace(/[^0-9]/g, '').slice(0, 2);
    const value = Number(digits);
    setMenus(digits === '' || value === 0 ? null : Math.min(MAX_MENUS, value));
  };

  // The counters are 36 px, under the house minimum of 44, because they are
  // not what the finger aims at: a dish is added by hitting its whole row,
  // 44 px tall and the width of the window, and how many menus is answered
  // once. Making them bigger cost a screenful of dishes.
  const countButton = 'bg-muted text-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-[3px] active:scale-95 disabled:opacity-40 disabled:active:scale-100';
  const dishButton = 'bg-card text-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-full border border-border outline-none transition focus-visible:ring-[3px] active:scale-95 disabled:opacity-40 disabled:active:scale-100';

  /**
   * A dish that has not been counted yet shows one `+` and nothing else. A
   * `− 0 +` on every line of a long card was forty greyed-out zeros to read
   * past; this way the eye finds what has been taken.
   */
  const dishStepper = (count: number, name: string, full: boolean, onMinus: () => void, onPlus: () => void) => (
    <div className="flex shrink-0 items-center gap-1">
      {count > 0 && (
        <>
          <button type="button" aria-label={`${t('menuOneLess')}: ${name}`} onClick={onMinus} className={dishButton}>
            <Minus className="size-4" />
          </button>
          <Ltr className="w-6 text-center text-base font-bold text-brand tabular-nums">{count}</Ltr>
        </>
      )}
      <button type="button" aria-label={`${t('menuOneMore')}: ${name}`} onClick={onPlus} disabled={full} className={dishButton}>
        <Plus className="size-4" />
      </button>
    </div>
  );

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{menu.name}</ModalTitle>
        <ModalDescription className="text-brand text-base font-semibold">
          {fmt(Number(menu.price))}
          {menu.fixed_menu_includes_cover ? <span className="text-sm font-normal text-muted-foreground"> · {t('menuIncludesCover')}</span> : null}
          {mode === 'fill' && menus !== null && (
            <span className="text-sm font-normal text-muted-foreground"> · {t('menuCount', { count: menus })}</span>
          )}
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="p-0">
        {/* The first question at the table. On the check the count changes
            from the menu's own row instead, so it is not asked twice. */}
        {mode !== 'fill' && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
              {t('menuHowMany')}
              {(covers ?? 0) > 1 && (
                <span className="ms-2 text-xs font-normal text-muted-foreground">{t('menuCoversHint', { count: Number(covers) })}</span>
              )}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={t('menuOneLess')}
                disabled={menus === null}
                onClick={() => setMenus((current) => (current === null || current <= 1 ? null : current - 1))}
                className={countButton}
              >
                <Minus className="size-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                dir="ltr"
                maxLength={2}
                value={menus === null ? '' : String(menus)}
                onChange={(event) => typeCount(event.target.value)}
                onFocus={(event) => event.target.select()}
                aria-label={t('menuHowMany')}
                placeholder="0"
                className={`h-9 w-12 rounded-lg border border-input bg-card text-center text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-brand ${
                  menus === null ? 'text-muted-foreground' : 'text-brand'
                }`}
              />
              <button
                type="button"
                aria-label={t('menuOneMore')}
                disabled={menus !== null && menus >= MAX_MENUS}
                onClick={() => setMenus((current) => Math.min(MAX_MENUS, (current ?? 0) + 1))}
                className={countButton}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {courses.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t('menuHasNoCourses')}</p>
        )}

        {courses.map((course) => {
          const count = countOfCourse(course.id);
          const capacity = capacityOf(course.max_choices);
          const tooMany = count > capacity;
          const short = menus !== null && course.is_required && count < menus;
          const room = Math.max(0, capacity - count);
          const choices = courseChoices(course, products);
          const state = tooMany ? null
            : short ? { label: t('menuCourseToChoose'), tone: 'text-pending' }
              : menus !== null && room === 0 ? { label: t('menuCourseFull'), tone: 'text-muted-foreground' }
                : !course.is_required && count === 0 ? { label: t('menuCourseOptional'), tone: 'text-muted-foreground' }
                  : null;

          return (
            <section key={course.id} aria-label={course.label}>
              {/* The course stays in sight while its dishes scroll under it:
                  twelve primi is a long list to come out of no longer knowing
                  how many are still to be chosen. */}
              <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-1.5">
                <h3 className="min-w-0 truncate text-sm font-bold text-foreground">{course.label}</h3>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {state && <span className={state.tone}>{state.label}</span>}
                  {(menus !== null || count > 0) && (
                    <span className={`font-semibold ${tooMany ? 'text-destructive' : count > 0 ? 'text-brand' : 'text-muted-foreground'}`}>
                      {menus === null
                        ? <Ltr>{count}</Ltr>
                        : t('menuCourseTaken', { taken: count, of: capacity })}
                    </span>
                  )}
                </span>
              </header>

              {tooMany && (
                <p className="border-b border-border bg-destructive/10 px-4 py-1.5 text-xs font-semibold text-destructive">
                  {t('menuCourseTooMany', { course: course.label, count: capacity })}
                </p>
              )}

              {choices.length === 0 ? (
                <p className="px-4 py-2 text-sm text-muted-foreground">{t('menuCourseEmpty')}</p>
              ) : choices.map((dish) => {
                const entries = tallies.filter((entry) => entry.course_id === course.id && entry.product_id === dish.id);
                const dishCount = entries.reduce((total, entry) => total + entry.quantity, 0);
                const noted = entries.filter((entry) => entry.own);
                const extra = courseSurcharge(course, dish.id);
                return (
                  <div
                    key={dish.id}
                    className={`border-b border-border last:border-0 ${dishCount > 0 ? 'bg-brand-light' : ''}`}
                  >
                    <div className="flex items-center gap-2 ps-4 pe-2">
                      {/* The whole name is the plus: the floor counts by tapping the dish. */}
                      <button
                        type="button"
                        onClick={() => addOne(course.id, dish.id, course.max_choices)}
                        disabled={room === 0}
                        aria-label={`${t('menuOneMore')}: ${dish.name}`}
                        className="flex min-h-touch min-w-0 flex-1 items-center justify-between gap-3 text-start disabled:cursor-not-allowed"
                      >
                        <span className={`text-sm ${dishCount > 0 ? 'font-semibold text-brand' : 'font-medium text-foreground'}`}>{dish.name}</span>
                        {extra > 0 && (
                          <span className={`shrink-0 text-xs ${dishCount > 0 ? 'font-semibold text-brand' : 'text-muted-foreground'}`}>
                            <Ltr>+{fmt(extra)}</Ltr>
                          </span>
                        )}
                      </button>
                      {dishStepper(
                        dishCount,
                        dish.name,
                        room === 0,
                        () => removeOne(course.id, dish.id),
                        () => addOne(course.id, dish.id, course.max_choices),
                      )}
                    </div>

                    {dishCount > 0 && (
                      <div className="flex flex-col gap-1.5 pb-2 ps-7 pe-2">
                        {/* One of the plates counted above, and what the
                            kitchen has to know about that one. The note has
                            the line to itself: beside a picker and a counter
                            it was down to a dozen characters, and "senza
                            besciamella" read "nza besciamella". */}
                        {noted.map((entry) => (
                          <div key={entry.key} className="flex items-center gap-2">
                            <Ltr className="shrink-0 text-xs font-bold text-brand">1×</Ltr>
                            <input
                              type="text"
                              value={entry.note}
                              onChange={(event) => amendNote(entry.key, event.target.value.slice(0, NOTE_LENGTH))}
                              placeholder={t('menuDishNotePlaceholder')}
                              aria-label={`${t('menuDishNotePlaceholder')}: ${dish.name}`}
                              maxLength={NOTE_LENGTH}
                              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
                            />
                            <button
                              type="button"
                              onClick={() => dropNote(entry.key)}
                              aria-label={`${t('menuNoteRemove')}: ${dish.name}`}
                              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground active:scale-95"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => noteOne(course.id, dish.id, course.max_choices)}
                          className="flex min-h-9 items-center gap-1.5 self-start rounded-lg pe-2 text-xs font-semibold text-brand active:bg-muted"
                        >
                          <MessageSquarePlus className="size-3.5" />
                          {t('menuPortionApart')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </ModalBody>

      <ModalFooter className="px-4 py-3">
        {/* Said once, plainly, next to the button that takes the order
            anyway. A dialog here would be a dialog every evening in a house
            that sells the menu without dessert. */}
        {missing.length > 0 && (
          <p className="text-center text-xs text-pending">
            {t('menuMissingCourses', { courses: missing.map((course) => course.label).join(', ') })}
          </p>
        )}
        {surcharge > 0 && menus !== null && mode !== 'fill' && (
          <p className="text-center text-xs text-muted-foreground">
            {t('menuSurchargeNote', { base: fmt((Number(menu.price) || 0) * menus), extra: fmt(surcharge) })}
          </p>
        )}
        <Button onClick={() => { if (menus !== null) onAdd(menu, menus, selection); }} disabled={!canSave} className="w-full" size="touch-lg">
          {menus === null
            ? t('menuHowMany')
            : mode === 'add'
              ? t('menuAddCount', { count: menus, total: fmt(lineTotal) })
              : mode === 'edit'
                ? t('saveItemChanges', { total: fmt(lineTotal) })
                : tCommon('save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
