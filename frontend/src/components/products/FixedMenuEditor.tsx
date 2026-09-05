'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Category, FixedMenuCourse, Product } from '@/lib/types';
import { courseAllowsProduct } from '@/lib/fixed-menu';

/**
 * Building a fixed menu: its courses, where each draws from, and what a single
 * dish inside one costs extra (docs/coperto-e-menu-fisso.md).
 *
 * A course points at categories rather than a list of dishes. That is the whole
 * point: switch off the tart because it ran out and the "fruit or dessert"
 * course follows by itself, with nothing to maintain by hand.
 *
 * The dish list under the categories is where the two exceptions to that live:
 * unticking a dish takes it out of a category the course does draw from, and
 * the search box under it takes one in from a category it does not. Both sit
 * in the same grid as the surcharges, because "is it in, and what does it cost
 * extra" is one question the owner asks dish by dish.
 */
interface Props {
  menu: Product;
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

type DraftCourse = {
  key: string;
  label: string;
  is_required: boolean;
  max_choices: number;
  category_ids: string[];
  surcharges: { product_id: string; surcharge: number }[];
  included_product_ids: string[];
  excluded_product_ids: string[];
};

function toDraft(course: FixedMenuCourse, index: number): DraftCourse {
  return {
    key: `${course.id}:${index}`,
    label: course.label,
    is_required: course.is_required,
    max_choices: course.max_choices,
    category_ids: course.category_ids,
    surcharges: course.surcharges,
    included_product_ids: course.included_product_ids || [],
    excluded_product_ids: course.excluded_product_ids || [],
  };
}

export default function FixedMenuEditor({ menu, categories, products, onClose }: Props) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const [courses, setCourses] = useState<DraftCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dishQuery, setDishQuery] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/fixed-menus/${menu.id}`);
        if (!cancelled) setCourses(((data.courses || []) as FixedMenuCourse[]).map(toDraft));
      } catch {
        if (!cancelled) toast.error(t('fixedMenuLoadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [menu.id, t]);

  const patch = (key: string, changes: Partial<DraftCourse>) => {
    setCourses((current) => current.map((course) => (course.key === key ? { ...course, ...changes } : course)));
  };

  const inCategory = (productId: string, categoryId: string) => (
    String(products.find((p) => p.id === productId)?.category_id ?? '') === categoryId
  );

  const toggleCategory = (course: DraftCourse, categoryId: string) => {
    const has = course.category_ids.includes(categoryId);
    patch(course.key, {
      category_ids: has
        ? course.category_ids.filter((id) => id !== categoryId)
        : [...course.category_ids, categoryId],
      // A dish that leaves the course keeps no surcharge behind it, and no
      // exclusion either: with its category gone the exclusion says nothing,
      // and left in place it would spring back the day the category returns.
      // Inclusions are the opposite — a dish taken in explicitly is not the
      // category's to take away.
      surcharges: has
        ? course.surcharges.filter((entry) => !inCategory(entry.product_id, categoryId))
        : course.surcharges,
      excluded_product_ids: has
        ? course.excluded_product_ids.filter((id) => !inCategory(id, categoryId))
        : course.excluded_product_ids,
    });
  };

  /** In or out of the course, whatever its category says. */
  const toggleDish = (course: DraftCourse, dish: Product, wanted: boolean) => {
    const byCategory = dish.category_id != null && course.category_ids.includes(String(dish.category_id));
    patch(course.key, {
      included_product_ids: wanted && !byCategory
        ? [...course.included_product_ids, dish.id]
        : course.included_product_ids.filter((id) => id !== dish.id),
      excluded_product_ids: !wanted && byCategory
        ? [...course.excluded_product_ids, dish.id]
        : course.excluded_product_ids.filter((id) => id !== dish.id),
      // Dropping a dish drops what it charged extra: leaving that behind would
      // quietly reprice it the day somebody puts it back.
      surcharges: wanted ? course.surcharges : course.surcharges.filter((entry) => entry.product_id !== dish.id),
    });
  };

  const setSurcharge = (course: DraftCourse, productId: string, raw: string) => {
    const amount = Number(raw.replace(',', '.'));
    const rest = course.surcharges.filter((entry) => entry.product_id !== productId);
    patch(course.key, {
      surcharges: Number.isFinite(amount) && amount > 0 ? [...rest, { product_id: productId, surcharge: amount }] : rest,
    });
  };

  const save = async () => {
    // Checked here so the owner gets a sentence in their own language. The
    // backend enforces the same rules — this is not a substitute for that.
    const nameless = courses.find((course) => !course.label.trim());
    if (nameless) return toast.error(t('fixedMenuCourseNeedsName'));
    const uncategorised = courses.find((course) => course.category_ids.length === 0);
    if (uncategorised) return toast.error(t('fixedMenuCourseNeedsCategory', { course: uncategorised.label }));

    setSaving(true);
    try {
      await api.put(`/fixed-menus/${menu.id}`, {
        courses: courses.map((course, index) => ({
          label: course.label,
          is_required: course.is_required,
          max_choices: course.max_choices,
          sort_order: index,
          category_ids: course.category_ids,
          surcharges: course.surcharges,
          included_product_ids: course.included_product_ids,
          excluded_product_ids: course.excluded_product_ids,
        })),
      });
      toast.success(t('fixedMenuSaved'));
      onClose();
    } catch {
      toast.error(t('fixedMenuSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{t('fixedMenuCourses')}</h2>
            <p className="text-sm text-gray-500">{menu.name} · {fmt(Number(menu.price))}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <p className="text-sm text-gray-500">{tCommon('loading')}</p>}
          {!loading && courses.length === 0 && <p className="text-sm text-gray-500">{t('fixedMenuNoCourses')}</p>}

          {courses.map((course) => {
            // What the waiter will be offered, worked out with the same helper
            // the till uses — so this list is a preview and not a second
            // opinion. A menu is never a course of another menu.
            const selectable = products.filter((product) => product.is_active && !product.is_fixed_menu);
            const eligible = selectable.filter((product) => courseAllowsProduct(course, product));
            const query = (dishQuery[course.key] || '').trim().toLowerCase();
            const takeable = query
              ? selectable.filter((product) => (
                !courseAllowsProduct(course, product) && product.name.toLowerCase().includes(query)
              )).slice(0, 8)
              : [];
            return (
              <div key={course.key} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    value={course.label}
                    onChange={(e) => patch(course.key, { label: e.target.value.slice(0, 60) })}
                    placeholder={t('fixedMenuCourseLabel')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                  />
                  <label
                    className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap"
                    title={t('fixedMenuCourseRequiredHint')}
                  >
                    <input
                      type="checkbox"
                      checked={course.is_required}
                      onChange={(e) => patch(course.key, { is_required: e.target.checked })}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    {t('fixedMenuCourseRequired')}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    {t('fixedMenuCourseChoices')}
                    <input
                      type="number" min={1} max={10} value={course.max_choices}
                      onChange={(e) => patch(course.key, { max_choices: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                    />
                  </label>
                  <button
                    onClick={() => setCourses((current) => current.filter((entry) => entry.key !== course.key))}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">{t('fixedMenuCourseCategories')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((category) => {
                      const picked = course.category_ids.includes(String(category.id));
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategory(course, String(category.id))}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            picked ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {course.category_ids.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">{t('fixedMenuCourseDishes')}</p>
                    <p className="text-xs text-gray-500 mb-2">{t('fixedMenuCourseDishesHint')}</p>

                    {eligible.length === 0
                      ? <p className="text-xs text-gray-400 mb-2">{t('fixedMenuCourseNoDishes')}</p>
                      : (
                        <div className="grid grid-cols-2 gap-2">
                          {eligible.map((dish) => {
                            const fromOutside = dish.category_id == null
                              || !course.category_ids.includes(String(dish.category_id));
                            return (
                              <div key={dish.id} className="flex items-center justify-between gap-2 text-sm">
                                <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked
                                    onChange={() => toggleDish(course, dish, false)}
                                    className="rounded border-gray-300 text-brand focus:ring-brand shrink-0"
                                  />
                                  <span className="truncate text-gray-700">{dish.name}</span>
                                  {fromOutside && (
                                    <span className="text-[10px] text-sky-600 bg-sky-50 rounded px-1 shrink-0">
                                      {t('fixedMenuDishTakenIn')}
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="number" min="0" step="0.5"
                                  value={course.surcharges.find((entry) => entry.product_id === dish.id)?.surcharge ?? ''}
                                  onChange={(e) => setSurcharge(course, dish.id, e.target.value)}
                                  placeholder="0"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none shrink-0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                    <div className="mt-3">
                      <div className="relative">
                        <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={dishQuery[course.key] || ''}
                          onChange={(e) => setDishQuery((current) => ({ ...current, [course.key]: e.target.value }))}
                          placeholder={t('fixedMenuAddDishPlaceholder')}
                          className="w-full ps-8 pe-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand outline-none"
                        />
                      </div>
                      {query && takeable.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">{t('fixedMenuNoDishMatches')}</p>
                      )}
                      {takeable.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {takeable.map((dish) => (
                            <button
                              key={dish.id}
                              type="button"
                              onClick={() => {
                                toggleDish(course, dish, true);
                                setDishQuery((current) => ({ ...current, [course.key]: '' }));
                              }}
                              className="px-2.5 py-1 rounded-full text-xs border border-dashed border-gray-300 text-gray-600 hover:border-brand hover:text-brand"
                            >
                              <Plus size={12} className="inline -mt-0.5 me-1" />{dish.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            variant="outline"
            onClick={() => setCourses((current) => [...current, {
              key: `new-${Date.now()}-${current.length}`,
              label: '', is_required: true, max_choices: 1, category_ids: [], surcharges: [],
              included_product_ids: [], excluded_product_ids: [],
            }])}
          >
            <Plus size={16} /> {t('fixedMenuAddCourse')}
          </Button>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? tCommon('saving') : tCommon('save')}</Button>
        </div>
      </div>
    </div>
  );
}
