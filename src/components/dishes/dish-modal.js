"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";
import { X, ImagePlus } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";

const INITIAL_FORM = {
  nameEn: "",
  categoryId: "",
  subCategoryId: "",
  ingredientStockItemIds: [],
  price: "",
  showOnList: false,
  createdBy: "",
  imageUrl: null
};

export function DishModal({ isOpen, onClose, categories, stockItems, dish, onSave }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [form, setForm] = useState({ ...INITIAL_FORM, categoryId: categories[0]?.id || "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = !!dish;

  useEffect(() => {
    if (isOpen) {
      if (dish) {
        setForm({
          nameEn: dish.nameEn || "",
          categoryId: dish.categoryId || categories[0]?.id || "",
          subCategoryId: dish.subCategoryId || "",
          ingredientStockItemIds: dish.ingredients?.map((i) => i.stockItemId) || [],
          price: String(dish.price || ""),
          showOnList: dish.showOnList || false,
          createdBy: dish.createdBy || "",
          imageUrl: dish.imageUrl || null
        });
        setImagePreview(dish.imageUrl || null);
      } else {
        setForm({ ...INITIAL_FORM, categoryId: categories[0]?.id || "", subCategoryId: categories[0]?.subCategories?.[0]?.id || "" });
        setImagePreview(null);
      }
      setImageFile(null);
      setError("");
      setPriceTouched(false);
    }
  }, [isOpen, dish, categories]);

  const availableSubCategories = useMemo(
    () => categories.find((c) => c.id === form.categoryId)?.subCategories || [],
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
    if (!availableSubCategories.some((sc) => sc.id === form.subCategoryId)) {
      setForm((cur) => ({ ...cur, subCategoryId: availableSubCategories[0]?.id || "" }));
    }
  }, [availableSubCategories, form.subCategoryId]);

  useEffect(() => {
    if (!priceTouched && !isEditing) {
      setForm((cur) => ({ ...cur, price: suggestedPrice ? String(suggestedPrice) : "" }));
    }
  }, [suggestedPrice, priceTouched, isEditing]);

  function toggleIngredient(stockItemId) {
    setForm((cur) => ({
      ...cur,
      ingredientStockItemIds: cur.ingredientStockItemIds.includes(stockItemId)
        ? cur.ingredientStockItemIds.filter((id) => id !== stockItemId)
        : [...cur.ingredientStockItemIds, stockItemId]
    }));
  }

  function handleImageSelect(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be less than 5MB."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setError("");
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  }

  function removeImage() {
    setImageFile(null); setImagePreview(null);
    setForm((cur) => ({ ...cur, imageUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await onSave({ ...form, imageFile, price: form.price === "" ? suggestedPrice : Number(form.price) });
    } catch (err) {
      setError(err.message || "Failed to save dish.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      maxWidthClass="max-w-2xl"
      onBackdropClick={onClose}
    >
      <h3 className="mb-6 text-2xl font-bold text-[#ff242d]">{isEditing ? t("dishes.editDish") : t("dishes.createDish")}</h3>
      <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("dishes.dishNameEnglish")}</label>
              <input type="text" value={form.nameEn} onChange={(e) => setForm((c) => ({ ...c, nameEn: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder={t("dishes.dishNamePlaceholder")} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.category")}</label>
              <select value={form.categoryId} onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#ff242d]">
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{translateContent(cat.nameEn)}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.subCategory")}</label>
              <select value={form.subCategoryId} onChange={(e) => setForm((c) => ({ ...c, subCategoryId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#ff242d]">
                <option value="">{t("common.noSubCategory")}</option>
                {availableSubCategories.map((sc) => (<option key={sc.id} value={sc.id}>{translateContent(sc.nameEn)}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.createdBy")}</label>
              <input type="text" value={form.createdBy} onChange={(e) => setForm((c) => ({ ...c, createdBy: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder={t("dishes.createdByPlaceholder")} />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("dishes.dishImage")}</label>
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${isDragging ? "border-[#ff242d] bg-red-50" : imagePreview ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"}`}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect(e.target.files?.[0])} className="hidden" />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="mx-auto max-h-40 rounded-xl object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                    <ImagePlus className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">{t("dishes.dragDropImage")}</span>
                    <span className="text-sm text-[#ff242d]"> {t("dishes.browse")}</span>
                  </div>
                  <p className="text-xs text-slate-400">{t("dishes.imageHint")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Show on List Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-700">{t("dishes.showOnList")}</div>
              <div className="text-xs text-slate-500">{t("dishes.showOnListHelp")}</div>
            </div>
            <button type="button" onClick={() => setForm((c) => ({ ...c, showOnList: !c.showOnList }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.showOnList ? "bg-[#ff242d]" : "bg-slate-300"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showOnList ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Inventory Items */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">{t("dishes.inventoryItems")}</label>
              <span className="text-sm font-semibold text-[#ff242d]">{t("dishes.suggestedPrice", { price: formatCurrency(suggestedPrice) })}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stockItems.map((item) => {
                const checked = form.ingredientStockItemIds.includes(item.id);
                return (
                  <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${checked ? "border-[#ff242d] bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleIngredient(item.id)} className="mt-1 h-4 w-4 accent-[#ff242d]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">{translateContent(item.name)}</div>
                      <div className="text-sm text-slate-500">{t("dishes.qtyPrice", { quantity: item.quantity, price: item.price === null ? t("common.optional") : formatCurrency(item.price) })}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("dishes.dishPrice")}</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => { setPriceTouched(true); setForm((c) => ({ ...c, price: e.target.value })); }} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]" placeholder={t("dishes.autoSuggested")} />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{t("dishes.suggestedHelp")}</div>
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200">{t("common.cancel")}</button>
            <button type="submit" disabled={isSaving} className="rounded-2xl bg-[#ff242d] px-5 py-3 font-semibold text-white hover:bg-[#ea1d26] disabled:opacity-50">{isSaving ? t("common.saving") : isEditing ? t("common.save") : t("dishes.createDish")}</button>
          </div>
      </form>
    </ModalShell>
  );
}
