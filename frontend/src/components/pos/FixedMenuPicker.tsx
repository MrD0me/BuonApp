'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Category, FixedMenuSelection, Product } from '@/lib/types';
import { courseChoices, courseSurcharge, missingRequiredCourses, selectionIsValid, selectionSurcharge } from '@/lib/fixed-menu';
import { serviceRunForProduct } from '@/lib/service-runs';
import ServiceRunPicker from './ServiceRunPicker';

/**
 * Choosing a fixed menu, course by course (docs/coperto-e-menu-fisso.md).
 *
 * Props in, callback out, and no API client of its own — the same shape as
 * AddonModal. That is on purpose: the handheld app composes orders through its
 * own axios instance, and this window mounts there unchanged. The catalogue
 * arrives as a prop; nothing here fetches.
 *
 * The price shown is what the guest will be told. What the check actually says
 * is worked out again by the backend from its own catalogue.
 *
 * An unfinished menu is allowed out of here. The table orders the starters and
 * decides the main over them, and refusing the menu until every course is
 * filled meant the floor could not take the order it was being given. What is
 * missing is said in amber and asked for again on the check; it never stops
 * the order.
 *
 * The note and the run hang off each chosen dish rather than off the menu.
 * There was one note for the whole menu once and it went onto the package row,
 * which every kitchen ticket filters out — so nobody ever read it. The run is
 * the same kind of fact: a primo inside a menu leaves with the primi, and that
 * is about the dish, not about the menu it was chosen from.
 */
interface Props {
  menu: Product;
  products: Product[];
  /** For the wave each chosen dish goes out on, which lives on its category. */
  categories: Category[];
  onAdd: (menu: Product, selection: FixedMenuSelection) => void;
  onClose: () => void;
  initialSelection?: FixedMenuSelection;
  mode?: 'add' | 'edit' | 'fill';
  /** Show one course only — the empty slot the floor tapped on the check. */
  restrictToCourseId?: string;
  /** Offered after a menu is added, to repeat the same choices for the next guest. */
  onAddAnother?: (selection: FixedMenuSelection) => void;
}

export default function FixedMenuPicker({
  menu, products, categories, onAdd, onClose,
  initialSelection = [], mode = 'add', onAddAnother, restrictToCourseId,
}: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const [selection, setSelection] = useState<FixedMenuSelection>(initialSelection);

  const courses = useMemo(
    () => [...(menu.courses || [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .filter((course) => !restrictToCourseId || course.id === restrictToCourseId),
    [menu.courses, restrictToCourseId],
  );

  const surcharge = selectionSurcharge(menu, selection);
  const lineTotal = (Number(menu.price) || 0) + surcharge;
  // Only the ceiling blocks. An empty course is an order still being taken.
  const isValid = selectionIsValid(menu, selection);
  const missing = missingRequiredCourses(menu, selection);

  const pickedFor = (courseId: string) => selection.filter((choice) => choice.course_id === courseId);

  const toggle = (courseId: string, productId: string, maxChoices: number) => {
    setSelection((current) => {
      const isPicked = current.some((choice) => choice.course_id === courseId && choice.product_id === productId);
      if (isPicked) {
        return current.filter((choice) => !(choice.course_id === courseId && choice.product_id === productId));
      }
      const others = current.filter((choice) => choice.course_id !== courseId);
      const mine = current.filter((choice) => choice.course_id === courseId);
      // One choice per course is the ordinary case, and there the new pick
      // replaces the old rather than being refused: tapping the other main is
      // a correction, not a second main.
      const kept = maxChoices <= 1 ? [] : mine.slice(Math.max(0, mine.length - (maxChoices - 1)));
      return [...others, ...kept, { course_id: courseId, product_id: productId }];
    });
  };

  /** Edits one chosen dish in place — its note, or the wave it goes out on. */
  const amend = (courseId: string, productId: string, changes: { note?: string; service_run?: number }) => {
    setSelection((current) => current.map((choice) => (
      choice.course_id === courseId && choice.product_id === productId
        ? { ...choice, ...changes }
        : choice
    )));
  };

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="md">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{menu.name}</ModalTitle>
        <ModalDescription className="text-brand text-base font-semibold">
          {fmt(Number(menu.price))}
          {menu.fixed_menu_includes_cover ? <span className="text-sm font-normal text-muted-foreground"> · {t('menuIncludesCover')}</span> : null}
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('menuHasNoCourses')}</p>
        )}

        {courses.map((course) => {
          const picked = pickedFor(course.id);
          const choices = courseChoices(course, products);
          const stillEmpty = course.is_required && picked.length === 0;

          return (
            <div key={course.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">{course.label}</h3>
                <span className="flex items-center gap-2 text-xs">
                  <span className={stillEmpty ? 'font-semibold text-pending' : 'text-muted-foreground'}>
                    {course.is_required ? t('menuCourseExpected') : t('menuCourseOptional')}
                  </span>
                  {course.max_choices > 1 && (
                    <span className="font-semibold text-muted-foreground">
                      {t('menuCoursePicked', { picked: picked.length, max: course.max_choices })}
                    </span>
                  )}
                </span>
              </div>

              {choices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('menuCourseEmpty')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {choices.map((dish) => {
                    const chosen = picked.find((choice) => choice.product_id === dish.id);
                    const extra = courseSurcharge(course, dish.id);
                    return (
                      <div key={dish.id}>
                        <button
                          type="button"
                          aria-pressed={Boolean(chosen)}
                          onClick={() => toggle(course.id, dish.id, course.max_choices)}
                          className={`flex min-h-touch-lg w-full items-center justify-between gap-3 rounded-xl border px-3 py-1.5 text-start transition active:scale-[0.99] ${
                            chosen ? 'border-brand bg-brand-light text-brand' : 'border-border bg-card text-foreground'
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${chosen ? 'border-brand bg-brand text-white' : 'border-input bg-card'}`}
                            >
                              {chosen && <Check className="size-4" />}
                            </span>
                            <span className="text-base font-medium">{dish.name}</span>
                          </span>
                          {extra > 0 && (
                            <span className={`shrink-0 text-sm ${chosen ? 'font-semibold' : 'text-muted-foreground'}`}>
                              +{fmt(extra)}
                            </span>
                          )}
                        </button>

                        {/* The note and the wave belong to the dish, and only
                            once it has actually been chosen. */}
                        {chosen && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 ps-3">
                            <input
                              type="text"
                              value={chosen.note || ''}
                              onChange={(e) => amend(course.id, dish.id, { note: e.target.value.slice(0, 100) })}
                              placeholder={t('menuDishNotePlaceholder')}
                              aria-label={t('menuDishNotePlaceholder')}
                              maxLength={100}
                              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
                            />
                            <ServiceRunPicker
                              value={chosen.service_run ?? serviceRunForProduct(dish, categories)}
                              onChange={(run) => amend(course.id, dish.id, { service_run: run })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {stillEmpty && (
                <p className="mt-1.5 text-sm text-pending">{t('menuCourseLater', { course: course.label })}</p>
              )}
            </div>
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
        {surcharge > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('menuSurchargeNote', { base: fmt(Number(menu.price)), extra: fmt(surcharge) })}
          </p>
        )}
        <Button onClick={() => onAdd(menu, selection)} disabled={!isValid} className="w-full" size="touch-xl">
          {mode === 'add'
            ? t('addToCart', { total: fmt(lineTotal) })
            : t('saveItemChanges', { total: fmt(lineTotal) })}
        </Button>
        {/* Six guests taking the same menu is six menus, so repeating the
            last set of choices has to be one tap rather than one more pass
            through every course. */}
        {mode === 'add' && onAddAnother && (
          <Button
            variant="outline"
            size="touch-lg"
            onClick={() => onAddAnother(selection)}
            disabled={!isValid}
            className="w-full"
          >
            {t('menuAddAnother')}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
