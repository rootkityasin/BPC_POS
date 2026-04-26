"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, ListFilter, Pencil, Trash2, X } from "lucide-react";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";

const CATEGORY_FORM = { nameEn: "", color: "#2771cb" };

export function CategoryClient({
  categories,
  subCategories,
  canCreate = true,
  canManageCategories = true,
  canManageSubCategories = true,
  showStoreColumn = false
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editingKind, setEditingKind] = useState(null);
  const [categoryForm, setCategoryForm] = useState(CATEGORY_FORM);
  const [subCategoryForm, setSubCategoryForm] = useState({
    nameEn: "",
    categoryId: categories[0]?.id || ""
  });
  const itemsPerPage = 4;

  const activeData = activeTab === "categories" ? categories : subCategories;
  const filteredData = activeData.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.nameEn.toLowerCase().includes(query);
  });
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const modalTitle = activeTab === "categories" ? t("categoryPage.addNewCategory") : t("categoryPage.addNewSubCategory");
  const addButtonLabel = activeTab === "categories" ? t("common.addCategory") : t("common.addSubCategory");
  const subCategoryChoices = useMemo(() => categories, [categories]);
  const currentTabCanManage = activeTab === "categories" ? canManageCategories : canManageSubCategories;

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function openAddModal() {
    setError("");
    setEditingItem(null);
    setEditingKind(null);
    setCategoryForm(CATEGORY_FORM);
    setSubCategoryForm({ nameEn: "", categoryId: categories[0]?.id || "" });
    setIsAddModalOpen(true);
  }

  function openEditModal(item) {
    setError("");
    setEditingItem(item);
    if (activeTab === "categories") {
      setEditingKind("category");
      setCategoryForm({ nameEn: item.nameEn || "", color: item.color || "#2771cb" });
    } else {
      setEditingKind("subcategory");
      setSubCategoryForm({ nameEn: item.nameEn || "", categoryId: item.categoryId || categories[0]?.id || "" });
    }
    setIsAddModalOpen(true);
  }

  async function handleDelete(item) {
    const endpoint = activeTab === "categories" ? "/api/v1/category" : "/api/v1/subcategory";

    if (!window.confirm(`Delete ${translateContent(item.nameEn)}?`)) {
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, storeId: item.storeId || item.store?.id || "" })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to delete item.");
        return;
      }

      router.refresh();
    } catch {
      alert("Failed to delete item.");
    }
  }

  async function handleSave() {
    const isCategory = activeTab === "categories";
    const endpoint = isCategory ? "/api/v1/category" : "/api/v1/subcategory";
    const payload = isCategory
      ? {
          id: editingKind === "category" ? editingItem?.id : undefined,
          storeId: editingKind === "category" ? editingItem?.storeId || editingItem?.store?.id || "" : undefined,
          ...categoryForm
        }
      : {
          id: editingKind === "subcategory" ? editingItem?.id : undefined,
          storeId: editingKind === "subcategory" ? editingItem?.storeId || editingItem?.store?.id || "" : undefined,
          ...subCategoryForm
        };

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(endpoint, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Failed to save item.");
        return;
      }

      window.dispatchEvent(new Event("bpc:translations-updated"));
      setIsAddModalOpen(false);
      setEditingItem(null);
      setEditingKind(null);
      router.refresh();
    } catch {
      setError("Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fdfdfd]">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <h2 className="text-[28px] font-bold text-[#2771cb]">{t("categoryPage.title")}</h2>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-[52px] w-[400px] items-center rounded-xl border border-slate-100 bg-white px-5 text-[15px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <input
            type="text"
            placeholder={t("common.searchInput")}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent text-[#2771cb] outline-none placeholder:text-[#2771cb]/50"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={!canCreate || !currentTabCanManage}
          className="text-[17px] font-bold text-[#2771cb] transition-colors hover:text-[#13508b]"
        >
          {canCreate && currentTabCanManage ? addButtonLabel : "Select a store to add items"}
        </button>
      </div>

      <div className="rounded-[24px] border border-slate-50 bg-white p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab("categories");
                setCurrentPage(1);
              }}
              className={`rounded-full px-6 py-2.5 text-[14px] font-bold transition-colors ${
                activeTab === "categories"
                  ? "bg-[#2771cb] text-white"
                  : "bg-[#e5f1ff] text-[#13508b] hover:bg-[#d6e8ff]"
              }`}
            >
              {t("categoryPage.categories")}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("subCategories");
                setCurrentPage(1);
              }}
              className={`rounded-full px-6 py-2.5 text-[14px] font-bold transition-colors ${
                activeTab === "subCategories"
                  ? "bg-[#2771cb] text-white"
                  : "bg-[#e5f1ff] text-[#13508b] hover:bg-[#d6e8ff]"
              }`}
            >
              {t("categoryPage.subCategory")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f1ff] text-[#13508b] transition-colors hover:bg-[#d6e8ff]">
              <ListFilter className="h-[18px] w-[18px]" />
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f1ff] text-[#13508b] transition-colors hover:bg-[#d6e8ff]">
              <Download className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-12 gap-4 px-6 pb-4 text-[13px] font-bold uppercase tracking-wider text-[#13508b]">
          {activeTab === "categories" ? (
            <>
              <div className="col-span-3">{t("categoryPage.categoryName")}</div>
              <div className={showStoreColumn ? "col-span-2" : "col-span-3"}>{t("categoryPage.description")}</div>
              {showStoreColumn ? <div className="col-span-2">Store</div> : null}
              <div className={`${showStoreColumn ? "col-span-2" : "col-span-3"} text-center`}>{t("common.totalDishes")}</div>
              <div className="col-span-2 text-center">{t("common.lastUpdated")}</div>
              {canManageCategories ? <div className="col-span-1 text-center">{t("common.actions")}</div> : null}
            </>
          ) : (
            <>
              <div className={showStoreColumn ? "col-span-2" : "col-span-3"}>{t("categoryPage.subCategoryName")}</div>
              <div className="col-span-2">{t("categoryPage.categoryName")}</div>
              <div className="col-span-2">{t("categoryPage.description")}</div>
              {showStoreColumn ? <div className="col-span-2">Store</div> : null}
              <div className="col-span-2 text-center">{t("common.totalDishes")}</div>
              <div className="col-span-2 text-center">{t("common.lastUpdated")}</div>
              {canManageSubCategories ? <div className="col-span-1 text-center">{t("common.actions")}</div> : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          {paginatedData.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-center gap-4 rounded-[20px] bg-[#f8fbff] px-6 py-5">
              {activeTab === "categories" ? (
                <>
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || "#2771cb" }} />
                    <span className="text-[14px] font-bold text-[#2771cb]">{translateContent(item.nameEn)}</span>
                  </div>
                   <div className={`${showStoreColumn ? "col-span-2" : "col-span-3"} text-[14px] font-medium text-[#2771cb]/70`}>{translateContent(item.nameEn)}</div>
                   {showStoreColumn ? <div className="col-span-2 text-[14px] font-medium text-[#2771cb]/70">{item.store?.nameEn || "Unknown store"}</div> : null}
                   <div className={`${showStoreColumn ? "col-span-2" : "col-span-3"} text-center text-[14px] font-bold text-[#2771cb]`}>
                     {item._count?.dishes || 0} {t((item._count?.dishes || 0) === 1 ? "common.dish" : "dishes.title")}
                   </div>
                   <div className="col-span-2 text-center text-[14px] font-medium text-[#2771cb]/70">{formatDate(item.updatedAt)}</div>
                   {canManageCategories ? (
                     <div className="col-span-1 flex items-center justify-center gap-3">
                      <button type="button" onClick={() => openEditModal(item)} className="text-[#2771cb] transition-colors hover:text-[#13508b]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(item)} className="text-[#2771cb]/50 transition-colors hover:text-[#2771cb]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                   ) : null}
                </>
              ) : (
                <>
                   <div className={`${showStoreColumn ? "col-span-2" : "col-span-3"} flex items-center gap-4`}>
                     <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category?.color || "#2771cb" }} />
                     <span className="text-[14px] font-bold text-[#2771cb]">{translateContent(item.nameEn)}</span>
                   </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category?.color || "#2771cb" }} />
                    <span className="text-[14px] font-bold text-[#2771cb]">{translateContent(item.category?.nameEn)}</span>
                  </div>
                   <div className="col-span-2 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-[#2771cb]/70">{translateContent(item.nameEn)}</div>
                   {showStoreColumn ? <div className="col-span-2 text-[14px] font-medium text-[#2771cb]/70">{item.store?.nameEn || "Unknown store"}</div> : null}
                   <div className="col-span-2 text-center text-[14px] font-bold text-[#2771cb]">
                     {item._count?.dishes || 0} {t((item._count?.dishes || 0) === 1 ? "common.dish" : "dishes.title")}
                   </div>
                   <div className="col-span-2 text-center text-[14px] font-medium text-[#2771cb]/70">{formatDate(item.updatedAt)}</div>
                   {canManageSubCategories ? (
                     <div className="col-span-1 flex items-center justify-center gap-3">
                      <button type="button" onClick={() => openEditModal(item)} className="text-[#2771cb] transition-colors hover:text-[#13508b]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(item)} className="text-[#2771cb]/50 transition-colors hover:text-[#2771cb]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                   ) : null}
                </>
              )}
            </div>
          ))}

          {paginatedData.length === 0 && (
            <div className="py-12 text-center font-medium text-slate-500">
              {activeTab === "categories" ? t("categoryPage.noCategories") : t("categoryPage.noSubCategories")}
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="text-[13px] font-medium text-slate-500">
            {t("categoryPage.showing", { start: filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0, end: Math.min(currentPage * itemsPerPage, filteredData.length), total: filteredData.length, type: activeTab === "categories" ? t("categoryPage.categories").toLowerCase() : t("categoryPage.subCategory").toLowerCase() })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;
              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold transition-colors ${
                    currentPage === page
                      ? "bg-[#2771cb] text-white"
                      : "border border-slate-100 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="popup-scrollbar w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#2771cb]">{editingItem ? t("common.edit") : modalTitle}</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close popup"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === "categories" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("categoryPage.categoryNameEnglish")}</label>
                    <input
                      type="text"
                      value={categoryForm.nameEn}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, nameEn: event.target.value }))}
                       className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#2771cb]"
                      placeholder={t("categoryPage.categoryNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("categoryPage.color")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(event) => setCategoryForm((current) => ({ ...current, color: event.target.value }))}
                        className="h-12 w-12 cursor-pointer rounded-xl border border-slate-200"
                      />
                      <span className="font-medium text-[#2771cb]">{categoryForm.color}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("categoryPage.subCategoryNameEnglish")}</label>
                    <input
                      type="text"
                      value={subCategoryForm.nameEn}
                      onChange={(event) => setSubCategoryForm((current) => ({ ...current, nameEn: event.target.value }))}
                       className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#2771cb]"
                      placeholder={t("categoryPage.subCategoryNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.category")}</label>
                    <select
                      value={subCategoryForm.categoryId}
                      onChange={(event) => setSubCategoryForm((current) => ({ ...current, categoryId: event.target.value }))}
                       className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#2771cb]"
                    >
                      {subCategoryChoices.map((category) => (
                        <option key={category.id} value={category.id}>
                          {translateContent(category.nameEn)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {error && <div className="rounded-2xl bg-[#e5f1ff] px-4 py-3 text-sm font-medium text-[#13508b]">{error}</div>}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                   className="flex-1 rounded-2xl bg-[#2771cb] py-3 font-semibold text-white hover:bg-[#13508b] disabled:opacity-50"
                >
                  {isSaving ? t("common.saving") : editingItem ? t("common.save") : activeTab === "categories" ? t("categoryPage.saveCategory") : t("categoryPage.saveSubCategory")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
