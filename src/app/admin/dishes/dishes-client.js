"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";

const INITIAL_FORM = {
  nameEn: "",
  categoryId: "",
  subCategoryId: "",
  ingredientStockItemIds: [],
  price: ""
};

export function DishesClient({ dishes, categories, stockItems, canManage }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    categoryId: categories[0]?.id || ""
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);

  const availableSubCategories = useMemo(
    () => categories.find((category) => category.id === form.categoryId)?.subCategories || [],
    [categories, form.categoryId]
  );

  const selectedStockItems = useMemo(
    () => stockItems.filter((item) => form.ingredientStockItemIds.includes(item.id)),
    [stockItems, form.ingredientStockItemIds]
  );

  const suggestedPrice = useMemo(
    () => selectedStockItems.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [selectedStockItems]
  );

  useEffect(() => {
    if (!availableSubCategories.some((subCategory) => subCategory.id === form.subCategoryId)) {
      setForm((current) => ({
        ...current,
        subCategoryId: availableSubCategories[0]?.id || ""
      }));
    }
  }, [availableSubCategories, form.subCategoryId]);

  useEffect(() => {
    if (!priceTouched) {
      setForm((current) => ({
        ...current,
        price: suggestedPrice ? String(suggestedPrice) : ""
      }));
    }
  }, [suggestedPrice, priceTouched]);

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      categoryId: categories[0]?.id || "",
      subCategoryId: categories[0]?.subCategories?.[0]?.id || ""
    });
    setError("");
    setPriceTouched(false);
  }

  function toggleIngredient(stockItemId) {
    setForm((current) => ({
      ...current,
      ingredientStockItemIds: current.ingredientStockItemIds.includes(stockItemId)
        ? current.ingredientStockItemIds.filter((id) => id !== stockItemId)
        : [...current.ingredientStockItemIds, stockItemId]
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/v1/dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price === "" ? suggestedPrice : Number(form.price)
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Failed to create dish.");
        return;
      }

      window.dispatchEvent(new Event("bpc:translations-updated"));
      resetForm();
      router.refresh();
    } catch {
      setError("Failed to create dish.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{t("dishes.title")}</h2>
        <p className="text-sm text-slate-500">{t("dishes.subtitle")}</p>
      </div>

      {canManage && (
        <Card className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("dishes.dishNameEnglish")}</label>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("dishes.dishNamePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.category")}</label>
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#ff242d]"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {translateContent(category.nameEn)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.subCategory")}</label>
                <select
                  value={form.subCategoryId}
                  onChange={(event) => setForm((current) => ({ ...current, subCategoryId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#ff242d]"
                >
                  <option value="">{t("common.noSubCategory")}</option>
                  {availableSubCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {translateContent(subCategory.nameEn)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">{t("dishes.inventoryItems")}</label>
                <span className="text-sm font-semibold text-[#ff242d]">{t("dishes.suggestedPrice", { price: formatCurrency(suggestedPrice) })}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stockItems.map((item) => {
                  const checked = form.ingredientStockItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                        checked ? "border-[#ff242d] bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIngredient(item.id)}
                        className="mt-1 h-4 w-4 accent-[#ff242d]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{translateContent(item.name)}</div>
                        <div className="text-sm text-slate-500">{t("dishes.qtyPrice", { quantity: item.quantity, price: item.price === null ? t("common.optional") : formatCurrency(item.price) })}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("dishes.dishPrice")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => {
                    setPriceTouched(true);
                    setForm((current) => ({ ...current, price: event.target.value }));
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("dishes.autoSuggested")}
                />
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {t("dishes.suggestedHelp")}
              </div>
            </div>

            {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200">
                {t("common.reset")}
              </button>
              <button type="submit" disabled={isSaving} className="rounded-2xl bg-[#ff242d] px-5 py-3 font-semibold text-white hover:bg-[#ea1d26] disabled:opacity-50">
                {isSaving ? t("common.saving") : t("dishes.createDish")}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {dishes.map((dish) => (
          <Card key={dish.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">{translateContent(dish.nameEn)}</div>
                <div className="mt-3 text-xs text-slate-500">
                  {translateContent(dish.category.nameEn)} / {translateContent(dish.subCategory?.nameEn || "Unassigned")}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dish.ingredients.length > 0 ? (
                    dish.ingredients.map((ingredient) => (
                      <span key={ingredient.id} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#ff242d]">
                        {translateContent(ingredient.stockItem.name || "Unnamed item")}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{t("dishes.noInventoryItemsLinked")}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-800">{formatCurrency(dish.price)}</div>
                <div className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{canManage ? t("common.editable") : t("common.viewOnly")}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
