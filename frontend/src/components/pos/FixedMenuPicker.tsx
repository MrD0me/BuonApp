'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { FixedMenuSelection, Product } from '@/lib/types';
import { courseChoices, courseSurcharge, selectionIsComplete, selectionSurcharge } from '@/lib/fixed-menu';

/**
 * Choosing a fixed menu, course by course (docs/coperto-e-menu-fisso.md).
 *
 * Props in, callback out, and no API client of its own — the same shape as
 * AddonModal. That is on purpose: the handheld app composes orders through its
 * own axios instance, and when its rewrite comes this window has to mount
 * there unchanged. The catalogue arrives as a prop; nothing here fetches.
 *
 * The price shown is what the guest will be told. What the check actually says
 * is worked out again by the backend from its own catalogue.
 */
interface Props {
  menu: Product;
  products: Product[];
  onAdd: (menu: Product, selection: FixedMenuSelection, specialInstructions: string) => void;
  onClose: () => void;
  initialSelection?: FixedMenuSelection;
  initialInstructions?: string;
  mode?: 'add' | 'edit';
  /** Offered after a menu is added, to repeat the same choices for the next guest. */
  onAddAnother?: (selection: FixedMenuSelection, specialInstructions: string) => void;
}

export default function FixedMenuPicker({
  menu, products, onAdd, onClose,
  initialSelection = [], initialInstructions = '', mode = 'add', onAddAnother,
}: Props) {
  const t = useTranslations('pos');
  const fmt = useFormatCurrency();
  const [selection, setSelection] = useState<FixedMenuSelection>(initialSelection);
  const [instructions, setInstructions] = useState(initialInstructions);

  const courses = useMemo(
    () => [...(menu.courses || [])].sort((left, right) => left.sort_order - right.sort_order),
    [menu.courses],
  );

  const surcharge = selectionSurcharge(menu, selection);
  const lineTotal = (Number(menu.price) || 0) + surcharge;
  const isValid = selectionIsComplete(menu, selection);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{menu.name}</h2>
            <p className="text-brand font-semibold">
              {fmt(Number(menu.price))}
              {menu.fixed_menu_includes_cover ? <span className="text-xs text-gray-500 font-normal"> · {t('menuIncludesCover')}</span> : null}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {courses.length === 0 && (
            <p className="text-sm text-gray-500">{t('menuHasNoCourses')}</p>
          )}

          {courses.map((course) => {
            const picked = pickedFor(course.id);
            const choices = courseChoices(course, products);

            return (
              <div key={course.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-900">{course.label}</h3>
                  <span className="flex items-center gap-2">
                    {course.is_required
                      ? <span className="text-xs text-red-500 font-medium">{t('required')}</span>
                      : <span className="text-xs text-gray-400">{t('menuCourseOptional')}</span>}
                    {course.max_choices > 1 && (
                      <span className="text-xs text-sky-500 font-semibold">
                        {t('menuCoursePicked', { picked: picked.length, max: course.max_choices })}
                      </span>
                    )}
                  </span>
                </div>

                {choices.length === 0 ? (
                  <p className="text-xs text-gray-400">{t('menuCourseEmpty')}</p>
                ) : (
                  <div className="space-y-1">
                    {choices.map((dish) => {
                      const isPicked = picked.some((choice) => choice.product_id === dish.id);
                      const extra = courseSurcharge(course, dish.id);
                      return (
                        <button
                          type="button"
                          key={dish.id}
                          onClick={() => toggle(course.id, dish.id, course.max_choices)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                            isPicked ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{dish.name}</span>
                            {extra > 0 && (
                              <span className={`text-xs ${isPicked ? 'text-brand font-semibold' : 'text-gray-500'}`}>
                                +{fmt(extra)}
                              </span>
                            )}
                          </span>
                          {isPicked && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {course.is_required && picked.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">{t('menuCourseRequired', { course: course.label })}</p>
                )}
              </div>
            );
          })}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('specialInstructions')}</label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, 100))}
              placeholder={t('specialInstructionsPlaceholder')}
              maxLength={100}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs text-gray-400 text-end mt-0.5">{instructions.length}/100</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 space-y-2">
          {surcharge > 0 && (
            <p className="text-xs text-gray-500 text-center">
              {t('menuSurchargeNote', { base: fmt(Number(menu.price)), extra: fmt(surcharge) })}
            </p>
          )}
          <Button onClick={() => onAdd(menu, selection, instructions)} disabled={!isValid} className="w-full" size="lg">
            {mode === 'edit'
              ? t('saveItemChanges', { total: fmt(lineTotal) })
              : t('addToCart', { total: fmt(lineTotal) })}
          </Button>
          {/* Six guests taking the same menu is six menus, so repeating the
              last set of choices has to be one tap rather than one more pass
              through every course. */}
          {mode === 'add' && onAddAnother && (
            <Button
              variant="outline"
              onClick={() => onAddAnother(selection, instructions)}
              disabled={!isValid}
              className="w-full"
            >
              {t('menuAddAnother')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
