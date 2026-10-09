'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { FixedMenuCourse, FixedMenuSelection, Product } from '@/lib/types';
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
 * carrying a note included — a note does not make a second dish, it marks
 * plates already counted. Three lasagne out of five "senza besciamella" is one
 * note with a count of three, written once.
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
 *
 * Nothing on the list moves under the finger. A table of twenty is counted
 * in sixty quick taps without looking down between them, so every row keeps
 * its height and every control its place from the first tap to the last: the
 * minus and the count hold their room even at nought, the note for one
 * portion is an icon in that same row, and the footer says what is missing in
 * a line of fixed height. A list that grew a row under each dish as it was
 * first counted sent the next tap onto the dish below, or onto that row.
 */
interface Props {
  menu: Product;
  products: Product[];
  onAdd: (menu: Product, menus: number, selection: FixedMenuSelection) => void;
  onClose: () => void;
  initialSelection?: FixedMenuSelection;
  /**
   * How many menus the line already feeds — a cart line being edited, or a
   * line on the check. In `add` mode it is left out, and the count starts
   * unanswered; given there, it is a count the floor had already typed (the
   * handheld brings back a window left half done when the page was lost).
   */
  initialMenus?: number;
  /**
   * The window's count and dishes as they stand, after every change, for a
   * caller that keeps a draft of them. Nothing is sent anywhere by this.
   */
  onSelectionChange?: (menus: number | null, selection: FixedMenuSelection) => void;
  /** The table's covers, said under the count so the floor sees what it is aiming at. */
  covers?: number;
  mode?: 'add' | 'edit' | 'fill';
  /** Show one course only — the one the floor tapped on the check. */
  restrictToCourseId?: string;
}

/**
 * One counted entry: a dish's plain portions, or the portions that share one
 * note.
 *
 * A note is about the plates it is written on and no others, so it is a line
 * of its own under the dish, with a count of how many plates carry it. It
 * used to be a line per plate, and three lasagne "senza besciamella" were the
 * same note written three times.
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

/**
 * Selects what the count box holds, so the digits typed next replace it.
 *
 * An iPhone ignores a `select()` made while the focus is still arriving, and
 * the box kept its old digits: "8" and a typed "20" came out as 82 menus, the
 * two-digit limit dropping the zero. A frame later the selection holds.
 */
function selectAll(input: HTMLInputElement) {
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(0, input.value.length);
    } catch {
      // Gone, or no longer focused: nothing to select.
    }
  });
}

export default function FixedMenuPicker({
  menu, products, onAdd, onClose, onSelectionChange,
  initialSelection = [], initialMenus, covers, mode = 'add', restrictToCourseId,
}: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();

  // A course read back off the check is a row per portion; the window counts,
  // and the portions sharing a note come back as that note's one line.
  // The wave each row goes out in comes back with it and is left alone: it is
  // not a choice this window makes, so it is not one it counts by either.
  const [tallies, setTallies] = useState<Tally[]>(() => tallySelection(
    initialSelection.map((choice) => ({
      course_id: choice.course_id,
      product_id: choice.product_id,
      quantity: choice.quantity,
      ...(choice.note ? { note: choice.note } : {}),
    })),
  ).map((entry): Tally => {
    const note = (entry.note || '').trim();
    return {
      key: nextTallyKey(),
      course_id: entry.course_id,
      product_id: entry.product_id,
      quantity: portionsOf(entry),
      note,
      own: note !== '',
    };
  }));
  const [menus, setMenus] = useState<number | null>(
    mode === 'add' && initialMenus === undefined ? null : Math.max(1, Math.floor(Number(initialMenus)) || 1),
  );
  /**
   * The course whose full label lights up after a tap it had no room for. A
   * new object at every such tap, so a second tap starts the moment again.
   */
  const [fullTap, setFullTap] = useState<{ courseId: string } | null>(null);
  /** How many times the save button was tapped before the count was given; the count lights up. */
  const [askCount, setAskCount] = useState<number | null>(null);
  const countInput = useRef<HTMLInputElement>(null);

  const courses = useMemo(
    () => [...(menu.courses || [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .filter((course) => !restrictToCourseId || course.id === restrictToCourseId),
    [menu.courses, restrictToCourseId],
  );

  const selection: FixedMenuSelection = useMemo(() => tallySelection(tallies.filter((entry) => entry.quantity > 0).map((entry) => ({
    course_id: entry.course_id,
    product_id: entry.product_id,
    quantity: entry.quantity,
    ...(entry.note.trim() ? { note: entry.note.trim().slice(0, NOTE_LENGTH) } : {}),
  }))), [tallies]);

  // A caller keeping a draft hears every change. Its function is read through
  // a ref, so a parent that passes a new one on each render does not count
  // as a change.
  const selectionListener = useRef(onSelectionChange);
  useEffect(() => { selectionListener.current = onSelectionChange; });
  useEffect(() => { selectionListener.current?.(menus, selection); }, [menus, selection]);

  // The lit labels go back to how they read after a moment.
  useEffect(() => {
    if (!fullTap) return;
    const timer = window.setTimeout(() => setFullTap(null), 1200);
    return () => window.clearTimeout(timer);
  }, [fullTap]);
  useEffect(() => {
    if (askCount === null) return;
    const timer = window.setTimeout(() => setAskCount(null), 1200);
    return () => window.clearTimeout(timer);
  }, [askCount]);

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
  const footerNote = overfull.length > 0
    ? {
      text: t('menuCourseTooMany', { course: overfull[0].label, count: capacityOf(overfull[0].max_choices) }),
      tone: 'font-semibold text-destructive',
    }
    : missing.length > 0
      ? { text: t('menuMissingCourses', { courses: missing.map((course) => course.label).join(', ') }), tone: 'text-pending' }
      : surcharge > 0 && menus !== null && mode !== 'fill'
        ? { text: t('menuSurchargeNote', { base: fmt((Number(menu.price) || 0) * menus), extra: fmt(surcharge) }), tone: 'text-muted-foreground' }
        : null;
  const fullCourse = fullTap ? courses.find((course) => course.id === fullTap.courseId) : undefined;

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

  /**
   * The plus of a note's line: one more plate with that note, the same rule
   * as the note icon — a plain plate of the dish when there is one, so the
   * dish total does not move, and one more plate only when every plate of the
   * dish carries a note already and the course has room.
   */
  const moreNoted = (key: string, maxChoices: number) => {
    setTallies((current) => {
      const noted = current.find((entry) => entry.key === key);
      if (!noted) return current;
      const plain = current.find((entry) => isPlain(entry, noted.course_id, noted.product_id) && entry.quantity > 0);
      if (!plain && !roomIn(current, noted.course_id, maxChoices)) return current;
      return current
        .map((entry) => (
          entry === noted ? { ...entry, quantity: entry.quantity + 1 }
            : entry === plain ? { ...entry, quantity: entry.quantity - 1 }
              : entry
        ))
        .filter((entry) => entry.quantity > 0);
    });
  };

  /**
   * The ✕ of a note's line: one plate fewer with that note. The note goes,
   * the plate stays — it goes back into the plain count, so the dish total
   * does not move — and at the last plate the line goes with it. Taking a
   * plate off the dish is the dish's own minus.
   */
  const lessNoted = (key: string) => {
    setTallies((current) => {
      const noted = current.find((entry) => entry.key === key);
      if (!noted) return current;
      const plain = current.find((entry) => isPlain(entry, noted.course_id, noted.product_id));
      const kept = current
        .map((entry) => (
          entry === noted ? { ...entry, quantity: entry.quantity - 1 }
            : entry === plain ? { ...entry, quantity: entry.quantity + 1 }
              : entry
        ))
        .filter((entry) => entry.quantity > 0);
      return plain ? kept : [...kept, { key: nextTallyKey(), course_id: noted.course_id, product_id: noted.product_id, quantity: 1, note: '', own: false }];
    });
  };

  /** Only digits, and an empty box means the count is still unanswered. */
  const typeCount = (typed: string) => {
    const digits = typed.replace(/[^0-9]/g, '').slice(0, 2);
    const value = Number(digits);
    setMenus(digits === '' || value === 0 ? null : Math.min(MAX_MENUS, value));
  };

  /**
   * A tap on a dish, or on its plus. A course with no room left says so — its
   * full label lights up for a moment, and a screen reader hears it — instead
   * of swallowing the tap: a waiter counting twenty does not look at the
   * header between taps, and a tap that does nothing reads as a phone that
   * has stopped working. Asked of this render; `addOne` asks again of the
   * state it updates, for two taps that land before the screen redraws.
   */
  const tapDish = (course: FixedMenuCourse, productId: string) => {
    if (countOfCourse(course.id) >= capacityOf(course.max_choices)) {
      setFullTap({ courseId: course.id });
      return;
    }
    addOne(course.id, productId, course.max_choices);
  };

  /**
   * The plus of a note's line. Marking a plain plate always has room; only a
   * dish whose every plate carries a note already asks the course for one
   * more, and a full course says so the way a tap on a dish does.
   */
  const tapNotedPlus = (course: FixedMenuCourse, key: string, hasPlain: boolean) => {
    if (!hasPlain && countOfCourse(course.id) >= capacityOf(course.max_choices)) {
      setFullTap({ courseId: course.id });
      return;
    }
    moreNoted(key, course.max_choices);
  };

  /** The save button pressed before the count: the finger is taken to the count. */
  const askForCount = () => {
    setAskCount((asked) => (asked ?? 0) + 1);
    countInput.current?.focus();
  };

  // The counters are 36 px, under the house minimum of 44, because they are
  // not what the finger aims at: a dish is added by hitting its whole row,
  // 44 px tall and the width of the window, and how many menus is answered
  // once. Making them bigger cost a screenful of dishes.
  const countButton = 'bg-muted text-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-[3px] active:scale-95 disabled:opacity-40 disabled:active:scale-100';
  const dishButton = 'bg-card text-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-full border border-border outline-none transition focus-visible:ring-[3px] active:scale-95 disabled:opacity-40 disabled:active:scale-100';
  const noteButton = 'text-brand hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-[3px] active:scale-95';
  // The counter of a note's line is smaller still, 32 px: it is tapped a few
  // times and on purpose, and at the dish's size it left the note half the line.
  const noteCountButton = 'focus-visible:ring-ring/50 flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-[3px] active:scale-95';

  /**
   * The end of a dish row, always the same width: a note for one portion, the
   * minus, the count, the plus.
   *
   * A dish that has not been counted yet shows one `+` and nothing else — a
   * `− 0 +` on every line of a long card was forty greyed-out zeros to read
   * past, and this way the eye finds what has been taken. The others keep
   * their room all the same, invisible (out of reach of the finger, the
   * keyboard and the screen reader alike), so the name beside them never
   * changes width and never wraps onto a second line at the first tap.
   */
  const dishControls = (course: FixedMenuCourse, dishId: string, name: string, count: number, full: boolean) => {
    const untilCounted = count > 0 ? '' : 'invisible';
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`${t('menuPortionApart')}: ${name}`}
          title={t('menuPortionApart')}
          onClick={() => noteOne(course.id, dishId, course.max_choices)}
          className={`${noteButton} ${untilCounted}`}
        >
          <MessageSquarePlus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`${t('menuOneLess')}: ${name}`}
          onClick={() => removeOne(course.id, dishId)}
          className={`${dishButton} ${untilCounted}`}
        >
          <Minus className="size-4" />
        </button>
        <Ltr className={`w-6 text-center text-base font-bold text-brand tabular-nums ${untilCounted}`}>{count}</Ltr>
        <button
          type="button"
          aria-label={`${t('menuOneMore')}: ${name}`}
          aria-disabled={full || undefined}
          onClick={() => tapDish(course, dishId)}
          className={`${dishButton} ${full ? 'opacity-40' : ''}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  };

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <ModalHeader closeLabel={tCommon('close')} className={mode === 'fill' ? undefined : 'border-b-0'}>
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
        <p className="sr-only" aria-live="polite">
          {fullCourse ? t('menuCourseFullNotice', { course: fullCourse.label }) : ''}
        </p>
        {/* The first question at the table. On the check the count changes
            from the menu's own row instead, so it is not asked twice. */}
        {mode !== 'fill' && (
          <div className="flex items-center justify-between gap-3 border-y border-muted-foreground/40 px-4 py-2">
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
                ref={countInput}
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                pattern="[0-9]*"
                dir="ltr"
                maxLength={2}
                value={menus === null ? '' : String(menus)}
                onChange={(event) => typeCount(event.target.value)}
                onFocus={(event) => selectAll(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  event.currentTarget.blur();
                }}
                aria-label={t('menuHowMany')}
                placeholder="0"
                className={`h-9 w-12 rounded-lg border border-input bg-card text-center text-lg font-bold tabular-nums outline-none transition focus:ring-2 focus:ring-brand ${
                  menus === null ? 'text-muted-foreground' : 'text-brand'
                } ${askCount !== null ? 'ring-2 ring-pending' : ''}`}
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

        {courses.map((course, index) => {
          const count = countOfCourse(course.id);
          const capacity = capacityOf(course.max_choices);
          const tooMany = count > capacity;
          const short = menus !== null && course.is_required && count < menus;
          const room = Math.max(0, capacity - count);
          const choices = courseChoices(course, products);
          const full = room === 0;
          // A tap the course had no room for lights its full label up, in
          // place: same box, same padding, only the colours change.
          const state = fullTap?.courseId === course.id ? { label: t('menuCourseFull'), tone: 'bg-pending text-white' }
            : tooMany ? null
              : short ? { label: t('menuCourseToChoose'), tone: 'text-pending' }
                : menus !== null && full ? { label: t('menuCourseFull'), tone: 'text-muted-foreground' }
                  : !course.is_required && count === 0 ? { label: t('menuCourseOptional'), tone: 'text-muted-foreground' }
                    : null;

          return (
            <section
              key={course.id}
              aria-label={course.label}
              className={index > 0 ? 'border-t border-muted-foreground/40' : undefined}
            >
              {/* The course stays in sight while its dishes scroll under it:
                  twelve primi is a long list to come out of no longer knowing
                  how many are still to be chosen.

                  And it reads as a course, not as one more dish: a band of
                  blue a step stronger than the tint of a counted dish, closed
                  by the same darker line as the row that asks how many menus.
                  White like the dishes and shorter than one of them, it was
                  the counted dishes the eye found first, and the last dish of
                  one course ran into the next with nothing between them. The
                  first course draws no line above: the one under the how-many
                  row, or under the title, is already there, and two together
                  read as one thick one. The state is semibold to hold up on
                  the blue. */}
              <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-muted-foreground/40 bg-brand-band px-4 py-1.5">
                <h3 className="min-w-0 truncate text-sm font-bold text-foreground">{course.label}</h3>
                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                  {state && <span className={`rounded px-1.5 transition-colors ${state.tone}`}>{state.label}</span>}
                  {(menus !== null || count > 0) && (
                    <span className={`font-semibold ${tooMany ? 'text-destructive' : count > 0 ? 'text-brand' : 'text-muted-foreground'}`}>
                      {menus === null
                        ? <Ltr>{count}</Ltr>
                        : t('menuCourseTaken', { taken: count, of: capacity })}
                    </span>
                  )}
                </span>
              </header>

              {choices.length === 0 ? (
                <p className="ps-8 pe-4 py-2 text-sm text-muted-foreground">{t('menuCourseEmpty')}</p>
              ) : choices.map((dish) => {
                const entries = tallies.filter((entry) => entry.course_id === course.id && entry.product_id === dish.id);
                const dishCount = entries.reduce((total, entry) => total + entry.quantity, 0);
                const noted = entries.filter((entry) => entry.own);
                const extra = courseSurcharge(course, dish.id);
                const counted = dishCount > 0;
                // A counted dish changes colour, never weight: a bolder name
                // is a wider one, and a wider one can wrap and move the rows
                // below it. In a full course the dishes it does not hold
                // step back.
                const tone = counted ? 'text-brand' : full ? 'text-muted-foreground' : 'text-foreground';
                return (
                  <div
                    key={dish.id}
                    className={`border-b border-border last:border-0 ${counted ? 'bg-brand-light/50' : ''}`}
                  >
                    <div className="flex items-center gap-2 ps-8 pe-2 select-none [-webkit-touch-callout:none]">
                      {/* The whole name is the plus: the floor counts by tapping the dish. */}
                      <button
                        type="button"
                        onClick={() => tapDish(course, dish.id)}
                        aria-disabled={full || undefined}
                        aria-label={`${t('menuOneMore')}: ${dish.name}`}
                        className="flex min-h-touch min-w-0 flex-1 items-center justify-between gap-3 text-start"
                      >
                        <span className={`text-sm font-medium ${tone}`}>{dish.name}</span>
                        {extra > 0 && (
                          <span className={`shrink-0 text-xs font-medium ${counted ? 'text-brand' : 'text-muted-foreground'}`}>
                            <Ltr>+{fmt(extra)}</Ltr>
                          </span>
                        )}
                      </button>
                      {dishControls(course, dish.id, dish.name, dishCount, full)}
                    </div>

                    {noted.length > 0 && (
                      <div className="flex flex-col gap-1.5 pb-2 ps-8 pe-2">
                        {/* Some of the plates counted above, and what the
                            kitchen has to know about them. The note has the
                            line to itself: beside a picker and a counter it
                            was down to a dozen characters, and "senza
                            besciamella" read "nza besciamella". It appears
                            when the waiter asks for it, under the dish they
                            are looking at; nothing else on the list moves
                            on its own. Sixteen pixels on a phone, or an
                            iPhone zooms the page in on the first letter.

                            The line opens on a small counter of its own,
                            before the note it counts, so it reads "− 2 +
                            senza besciamella": a minus that gives a plate
                            back and takes the line away at the last, how
                            many plates carry the note, and a plus that marks
                            one more of the plain ones. Red and green, and
                            smaller than the dish's: at the end of the line,
                            under the dish's own counter and drawn like it,
                            it read as a second count of the dish, and at
                            full size it left the note half the line. One
                            note written once for three lasagne, not three
                            lines saying the same thing. */}
                        {noted.map((entry) => {
                          const plainLeft = entries.some((other) => !other.own && other.quantity > 0);
                          const noteName = entry.note.trim() ? `${dish.name} — ${entry.note.trim()}` : dish.name;
                          const plusFull = full && !plainLeft;
                          return (
                            <div key={entry.key} className="flex items-center gap-1.5">
                              <div className="flex shrink-0 items-center select-none [-webkit-touch-callout:none]">
                                <button
                                  type="button"
                                  onClick={() => lessNoted(entry.key)}
                                  aria-label={entry.quantity > 1 ? `${t('menuOneLess')}: ${noteName}` : `${t('menuNoteRemove')}: ${dish.name}`}
                                  className={`${noteCountButton} bg-red-100 text-red-700`}
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <Ltr className="w-5 text-center text-sm font-bold text-brand tabular-nums">{entry.quantity}</Ltr>
                                <button
                                  type="button"
                                  aria-label={`${t('menuOneMore')}: ${noteName}`}
                                  aria-disabled={plusFull || undefined}
                                  onClick={() => tapNotedPlus(course, entry.key, plainLeft)}
                                  className={`${noteCountButton} bg-green-100 text-green-700 ${plusFull ? 'opacity-40' : ''}`}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={entry.note}
                                onChange={(event) => amendNote(entry.key, event.target.value.slice(0, NOTE_LENGTH))}
                                placeholder={t('menuDishNotePlaceholder')}
                                aria-label={`${t('menuDishNotePlaceholder')}: ${dish.name}`}
                                maxLength={NOTE_LENGTH}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus:ring-2 focus:ring-brand sm:text-sm"
                              />
                            </div>
                          );
                        })}
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
            that sells the menu without dessert.

            One line of fixed height, whatever it has to say — too many plates
            first, then the courses still missing, then the surcharges — and
            the same height when it has nothing to say: a footer that grew and
            shrank pushed a short window up and down under the finger. */}
        <p aria-live="polite" className={`line-clamp-2 min-h-8 text-center text-xs ${footerNote?.tone ?? ''}`}>
          {footerNote?.text}
        </p>
        <Button
          onClick={() => {
            if (menus === null) askForCount();
            else onAdd(menu, menus, selection);
          }}
          disabled={menus !== null && !canSave}
          className="w-full"
          size="touch-lg"
        >
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
