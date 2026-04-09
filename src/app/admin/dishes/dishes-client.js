"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";
import { DishModal } from "@/components/dishes/dish-modal";
import { Search, Plus, Image as ImageIcon } from "lucide-react";

export function DishesClient({ dishes, categories, stockItems, canManage, userEmail }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const filteredDishes = useMemo(() => {
    if (!searchQuery.trim()) return dishes;
    const q = searchQuery.toLowerCase();
    return dishes.filter(
      (dish) =>
        dish.nameEn?.toLowerCase().includes(q) ||
        dish.createdBy?.toLowerCase().includes(q) ||
        dish.category?.nameEn?.toLowerCase().includes(q) ||
        dish.subCategory?.nameEn?.toLowerCase().includes(q)
    );
  }, [dishes, searchQuery]);

  async function handleSave(formData) {
    const isEditing = !!editingDish;
    const dishId = editingDish?.id;

    if (isEditing && dishId) {
      const res = await fetch("/api/v1/dishes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dishId,
          nameEn: formData.nameEn,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId,
          ingredientStockItemIds: formData.ingredientStockItemIds,
          price: formData.price,
          showOnList: formData.showOnList,
          createdBy: formData.createdBy,
          imageUrl: formData.imageUrl
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update dish.");
      }
    } else {
      const fd = new FormData();
      fd.append("nameEn", formData.nameEn);
      fd.append("categoryId", formData.categoryId);
      fd.append("subCategoryId", formData.subCategoryId);
      fd.append("ingredientStockItemIds", JSON.stringify(formData.ingredientStockItemIds));
      fd.append("price", String(formData.price));
      fd.append("showOnList", String(formData.showOnList));
      fd.append("createdBy", formData.createdBy || userEmail || "Admin");
      if (formData.imageFile) {
        fd.append("image", formData.imageFile);
      }

      const res = await fetch("/api/v1/dishes", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create dish.");
      }
    }

    window.dispatchEvent(new Event("bpc:translations-updated"));
    setIsModalOpen(false);
    setEditingDish(null);
    router.refresh();
  }

  async function handleToggleShowOnList(dish) {
    setTogglingId(dish.id);
    try {
      const res = await fetch("/api/v1/dishes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dish.id, showOnList: !dish.showOnList })
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setTogglingId(null);
    }
  }

  function openCreateModal() {
    setEditingDish(null);
    setIsModalOpen(true);
  }

  function openEditModal(dish) {
    setEditingDish(dish);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDish(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t("dishes.title")}</h2>
          <p className="text-sm text-slate-500">{t("dishes.subtitle")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-[#ff242d] px-5 py-3 font-semibold text-white hover:bg-[#ea1d26]"
          >
            <Plus className="h-4 w-4" />
            {t("dishes.createDish")}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("dishes.searchDishes")}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-[#ff242d]"
        />
      </div>

      {/* Dishes Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dishes.dishImage")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.name")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.category")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.createdBy")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.price")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dishes.showOnList")}</th>
                {canManage && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.actions")}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDishes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-slate-400">
                    {searchQuery ? t("dishes.noSearchResults") : t("dishes.noDishesYet")}
                  </td>
                </tr>
              ) : (
                filteredDishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {dish.imageUrl ? (
                        <img src={dish.imageUrl} alt={dish.nameEn} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{translateContent(dish.nameEn)}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dish.ingredients.length > 0 ? (
                          dish.ingredients.slice(0, 3).map((ing) => (
                            <span key={ing.id} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-[#ff242d]">
                              {translateContent(ing.stockItem?.name || "Item")}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{t("dishes.noInventoryItemsLinked")}</span>
                        )}
                        {dish.ingredients.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">+{dish.ingredients.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div>{translateContent(dish.category?.nameEn || "")}</div>
                      {dish.subCategory && (
                        <div className="text-xs text-slate-400">{translateContent(dish.subCategory.nameEn)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{dish.createdBy || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatCurrency(dish.price)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!canManage || togglingId === dish.id}
                        onClick={() => handleToggleShowOnList(dish)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                          dish.showOnList ? "bg-[#ff242d]" : "bg-slate-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dish.showOnList ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(dish)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          {t("common.edit")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dish Modal */}
      <DishModal
        isOpen={isModalOpen}
        onClose={closeModal}
        categories={categories}
        stockItems={stockItems}
        dish={editingDish}
        onSave={handleSave}
      />
    </div>
  );
}