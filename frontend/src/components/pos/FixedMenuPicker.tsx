'use client';

import { useMemo, useState } from 'react';
import { MessageSquarePlus, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Category, FixedMenuSelection, Product } from '@/lib/types';
import {
  courseCapacity, courseChoices, courseSurcharge, missingRequiredCourses, portionsOf, selectionSurcharge, tallySelection,
} from '@/lib/fixed-menu';
import { serviceRunForProduct } from '@/lib/service-runs';
import ServiceRunPicker from './ServiceRunPicker';

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
 * to lower it.
 *
 * An unfinished menu is allowed out of here. The table orders the starters and
 * decides the main over them, and refusing the menu until every course is
 * filled meant the floor could not take the order it was being given. What is
 * missing is said in amber and asked for again on the check; it never stops
 * the order. Too many is another thing: nine mains on eight menus is a
 * mis-ring, and the ninth is ordered from the card.
 *
 * The note and the run belong to one portion, not to the menu: the menu's row
 * never reaches a kitchen ticket. "Nota o uscita per una porzione" takes one
 * lasagna out of the plain count and gives it its own line — "senza
 * besciamella", or out with the starters.
 */
interface Props {
  menu: Product;
  products: Product[];
  /** For the wave each dish goes out on, which lives on its category. */
  categories: Category[];
  onAdd: (menu: Product, menus: number, selection: FixedMenuSelection) => void;
  onClose: () => void;
  initialSelection?: FixedMenuSelection;
  /** How many menus the line already feeds — a cart line being edited, or a line on the check. */
  initialMenus?: number;
  /** The table's covers: how far the quick buttons for the count go. */
  covers?: number;
  mode?: 'add' | 'edit' | 'fill';
  /** Show one course only — the one the floor tapped on the check. */
  restrictToCourseId?: string;
}

/** One counted entry: a dish's plain portions, or some with their own note or run. */
interface Tally {
  key: string;
  course_id: string;
  product_id: string;
  quantity: number;
  note: string;
  service_run?: number;
  /** Carries its own note or run and is drawn under its dish. The plain count is the dish row itself. */
  own: boolean;
}

let tallyKeys = 0;
const nextTallyKey = () => `tally-${++tallyKeys}`;

/** The quick buttons stop here; the plus goes on past it for a banquet. */
const MAX_QUICK_COUNTS = 12;
const MAX_MENUS = 99;

export default function FixedMenuPicker({
  menu, products, categories, onAdd, onClose,
  initialSelection = [], initialMenus, covers, mode = 'add', restrictToCourseId,
}: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();

  const defaultRunOf = (productId: string) => serviceRunForProduct(
    products.find((product) => product.id === productId), categories,
  );

  // A course read back off the check is a row per portion; the window counts.
  // A run that is only the dish's own default is no choice at all, so it does
  // not keep a portion apart from the plain count.
  const [tallies, setTallies] = useState<Tally[]>(() => tallySelection(initialSelection.map((choice) => (
    choice.service_run !== undefined && choice.service_run === defaultRunOf(choice.product_id)
      ? { ...choice, service_run: undefined }
      : choice
  ))).map((entry) => ({
    key: nextTallyKey(),
    course_id: entry.course_id,
    product_id: entry.product_id,
    quantity: portionsOf(entry),
    note: entry.note || '',
    service_run: entry.service_run,
    own: Boolean(entry.note) || entry.service_run !== undefined,
  })));
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
    ...(entry.note.trim() ? { note: entry.note.trim().slice(0, 100) } : {}),
    ...(entry.service_run !== undefined ? { service_run: entry.service_run } : {}),
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

  const quickCounts = Array.from(
    { length: Math.min(MAX_QUICK_COUNTS, Math.max(1, Math.floor(Number(covers)) || 1)) },
    (_, index) => index + 1,
  );

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
   * Gives one portion a line of its own, for a note or another wave. It comes
   * out of the plain count when there is one, so the dish total does not
   * move; otherwise it is one more portion, if the course has room.
   */
  const splitOne = (courseId: string, productId: string, maxChoices: number) => {
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

  const amendOwn = (key: string, changes: Partial<Pick<Tally, 'note' | 'service_run'>>) => {
    setTallies((current) => current.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));
  };

  const stepOwn = (key: string, delta: 1 | -1, courseId: string, maxChoices: number) => {
    setTallies((current) => {
      if (delta > 0 && !roomIn(current, courseId, maxChoices)) return current;
      return current
        .map((entry) => (entry.key === key ? { ...entry, quantity: entry.quantity + delta } : entry))
        .filter((entry) => entry.quantity > 0);
    });
  };

  const stepper = (
    count: number, label: string, onMinus: () => void, onPlus: () => void, plusDisabled: boolean,
  ) => (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-touch"
        aria-label={`${t('menuOneLess')}: ${label}`}
        onClick={onMinus}
        disabled={count === 0}
        className="disabled:invisible"
      >
        <Minus />
      </Button>
      <Ltr className={`w-8 text-center text-lg font-bold ${count > 0 ? 'text-brand' : 'text-muted-foreground'}`}>{count}</Ltr>
      <Button
        type="button"
        variant="outline"
        size="icon-touch"
        aria-label={`${t('menuOneMore')}: ${label}`}
        onClick={onPlus}
        disabled={plusDisabled}
      >
        <Plus />
      </Button>
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

      <ModalBody className="space-y-5">
        {/* The first question at the table, answered with one tap. On the
            check the count changes from the menu's own row instead. */}
        {mode !== 'fill' && (
          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">{t('menuHowMany')}</h3>
            <div className="flex flex-wrap gap-2">
              {quickCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={menus === count}
                  onClick={() => setMenus(count)}
                  className={`h-touch min-w-touch rounded-xl px-3 text-lg font-bold transition active:scale-95 ${
                    menus === count ? 'bg-brand text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  <Ltr>{count}</Ltr>
                </button>
              ))}
              {menus !== null && menus > quickCounts.length && (
                <span className="inline-flex h-touch min-w-touch items-center justify-center rounded-xl bg-brand px-3 text-lg font-bold text-white">
                  <Ltr>{menus}</Ltr>
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-touch"
                aria-label={t('menuMoreThanCovers')}
                onClick={() => setMenus((current) => Math.min(MAX_MENUS, (current ?? quickCounts.length) + 1))}
                disabled={menus !== null && menus >= MAX_MENUS}
              >
                <Plus />
              </Button>
            </div>
          </div>
        )}

        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('menuHasNoCourses')}</p>
        )}

        {courses.map((course) => {
          const count = countOfCourse(course.id);
          const capacity = capacityOf(course.max_choices);
          const tooMany = count > capacity;
          const short = menus !== null && course.is_required && count < menus;
          const full = count >= capacity;
          const choices = courseChoices(course, products);

          return (
            <section key={course.id} aria-label={course.label}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">{course.label}</h3>
                <span className="flex items-center gap-2 text-sm">
                  {!course.is_required && <span className="text-muted-foreground">{t('menuCourseOptional')}</span>}
                  <Ltr
                    className={`font-semibold ${tooMany ? 'text-destructive' : short ? 'text-pending' : count > 0 ? 'text-brand' : 'text-muted-foreground'}`}
                  >
                    {menus === null ? count : `${count}/${capacity}`}
                  </Ltr>
                </span>
              </div>

              {choices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('menuCourseEmpty')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {choices.map((dish) => {
                    const entries = tallies.filter((entry) => entry.course_id === course.id && entry.product_id === dish.id);
                    const dishCount = entries.reduce((total, entry) => total + entry.quantity, 0);
                    const own = entries.filter((entry) => entry.own);
                    const extra = courseSurcharge(course, dish.id);
                    return (
                      <div key={dish.id} className={`rounded-xl border ${dishCount > 0 ? 'border-brand bg-brand-light' : 'border-border bg-card'}`}>
                        <div className="flex items-center gap-2 py-1 ps-3 pe-1">
                          {/* The whole name is the plus: the floor counts by tapping the dish. */}
                          <button
                            type="button"
                            onClick={() => addOne(course.id, dish.id, course.max_choices)}
                            disabled={full}
                            className="flex min-h-touch-lg min-w-0 flex-1 items-center justify-between gap-3 text-start disabled:cursor-not-allowed"
                          >
                            <span className={`text-base font-medium ${dishCount > 0 ? 'text-brand' : 'text-foreground'}`}>{dish.name}</span>
                            {extra > 0 && (
                              <span className={`shrink-0 text-sm ${dishCount > 0 ? 'font-semibold text-brand' : 'text-muted-foreground'}`}>
                                <Ltr>+{fmt(extra)}</Ltr>
                              </span>
                            )}
                          </button>
                          {stepper(
                            dishCount,
                            dish.name,
                            () => removeOne(course.id, dish.id),
                            () => addOne(course.id, dish.id, course.max_choices),
                            full,
                          )}
                        </div>

                        {dishCount > 0 && (
                          <div className="flex flex-col gap-2 px-3 pb-2">
                            {/* The note gets the line to itself: beside the run
                                and the count it was down to a dozen characters,
                                and "senza besciamella" read "nza besciamella". */}
                            {own.map((entry) => (
                              <div key={entry.key} className="flex flex-col gap-2 ps-3">
                                <input
                                  type="text"
                                  value={entry.note}
                                  onChange={(event) => amendOwn(entry.key, { note: event.target.value.slice(0, 100) })}
                                  placeholder={t('menuDishNotePlaceholder')}
                                  aria-label={`${t('menuDishNotePlaceholder')}: ${dish.name}`}
                                  maxLength={100}
                                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <ServiceRunPicker
                                    value={entry.service_run ?? defaultRunOf(dish.id)}
                                    onChange={(run) => amendOwn(entry.key, { service_run: run })}
                                  />
                                  {stepper(
                                    entry.quantity,
                                    dish.name,
                                    () => stepOwn(entry.key, -1, course.id, course.max_choices),
                                    () => stepOwn(entry.key, 1, course.id, course.max_choices),
                                    full,
                                  )}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => splitOne(course.id, dish.id, course.max_choices)}
                              className="flex min-h-touch items-center gap-2 self-start rounded-lg ps-3 pe-2 text-sm font-semibold text-brand active:bg-muted"
                            >
                              <MessageSquarePlus className="size-4" />
                              {t('menuPortionApart')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tooMany && (
                <p className="mt-1.5 text-sm font-semibold text-destructive">
                  {t('menuCourseTooMany', { course: course.label, count: capacity })}
                </p>
              )}
            </section>
          );
        })}
      </ModalBody>

      <ModalFooter>
        {/* Said once, plainly, next to the button that takes the order
            anyway. A dialog here would be a dialog every evening in a house
            that sells the menu without dessert. */}
        {missing.length > 0 && (
          <p className="text-center text-sm text-pending">
            {t('menuMissingCourses', { courses: missing.map((course) => course.label).join(', ') })}
          </p>
        )}
        {surcharge > 0 && menus !== null && mode !== 'fill' && (
          <p className="text-center text-sm text-muted-foreground">
            {t('menuSurchargeNote', { base: fmt((Number(menu.price) || 0) * menus), extra: fmt(surcharge) })}
          </p>
        )}
        <Button onClick={() => { if (menus !== null) onAdd(menu, menus, selection); }} disabled={!canSave} className="w-full" size="touch-xl">
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
