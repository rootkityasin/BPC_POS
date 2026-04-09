"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, ListFilter, Pencil, Trash2, X } from "lucide-react";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";

const CATEGORY_FORM = { nameEn: "", color: "#ff242d" };

export function CategoryClient({ categories, subCategories }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
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

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function openAddModal() {
    setError("");
    setCategoryForm(CATEGORY_FORM);
    setSubCategoryForm({ nameEn: "", categoryId: categories[0]?.id || "" });
    setIsAddModalOpen(true);
  }

  async function handleSave() {
    const isCategory = activeTab === "categories";
    const endpoint = isCategory ? "/api/v1/category" : "/api/v1/subcategory";
    const payload = isCategory ? categoryForm : subCategoryForm;

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
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
        <h2 className="text-[28px] font-bold text-[#ff242d]">{t("categoryPage.title")}</h2>
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
            className="w-full bg-transparent text-[#ff242d] outline-none placeholder-[#ff8a90]"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="text-[17px] font-bold text-[#ff242d] transition-colors hover:text-[#ea1d26]"
        >
          {addButtonLabel}
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
                  ? "bg-[#cc0000] text-white"
                  : "bg-[#ffeaea] text-[#cc0000] hover:bg-[#ffd5d5]"
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
                  ? "bg-[#cc0000] text-white"
                  : "bg-[#ffeaea] text-[#cc0000] hover:bg-[#ffd5d5]"
              }`}
            >
              {t("categoryPage.subCategory")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5f5] text-[#cc0000] transition-colors hover:bg-[#ffeaea]">
              <ListFilter className="h-[18px] w-[18px]" />
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5f5] text-[#cc0000] transition-colors hover:bg-[#ffeaea]">
              <Download className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-12 gap-4 px-6 pb-4 text-[13px] font-bold uppercase tracking-wider text-[#cc0000]">
          {activeTab === "categories" ? (
            <>
              <div className="col-span-3">{t("categoryPage.categoryName")}</div>
              <div className="col-span-3">{t("categoryPage.description")}</div>
              <div className="col-span-3 text-center">{t("common.totalDishes")}</div>
              <div className="col-span-2 text-center">{t("common.lastUpdated")}</div>
              <div className="col-span-1 text-center">{t("common.actions")}</div>
            </>
          ) : (
            <>
              <div className="col-span-3">{t("categoryPage.subCategoryName")}</div>
              <div className="col-span-2">{t("categoryPage.categoryName")}</div>
              <div className="col-span-2">{t("categoryPage.description")}</div>
              <div className="col-span-2 text-center">{t("common.totalDishes")}</div>
              <div className="col-span-2 text-center">{t("common.lastUpdated")}</div>
              <div className="col-span-1 text-center">{t("common.actions")}</div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {paginatedData.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-center gap-4 rounded-[20px] bg-[#fffaf9] px-6 py-5">
              {activeTab === "categories" ? (
                <>
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || "#cc0000" }} />
                    <span className="text-[14px] font-bold text-[#ff242d]">{translateContent(item.nameEn)}</span>
                  </div>
                  <div className="col-span-3 text-[14px] font-medium text-[#ff242d]/70">{translateContent(item.nameEn)}</div>
                  <div className="col-span-3 text-center text-[14px] font-bold text-[#ff242d]">
                    {item._count?.dishes || 0} {t((item._count?.dishes || 0) === 1 ? "common.dish" : "dishes.title")}
                  </div>
                  <div className="col-span-2 text-center text-[14px] font-medium text-[#ff242d]/70">{formatDate(item.updatedAt)}</div>
                  <div className="col-span-1 flex items-center justify-center gap-3">
                    <button type="button" className="text-[#ff242d] transition-colors hover:text-[#ea1d26]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-[#ff242d]/50 transition-colors hover:text-[#ff242d]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category?.color || "#ff242d" }} />
                    <span className="text-[14px] font-bold text-[#ff242d]">{translateContent(item.nameEn)}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.category?.color || "#ff242d" }} />
                    <span className="text-[14px] font-bold text-[#ff242d]">{translateContent(item.category?.nameEn)}</span>
                  </div>
                  <div className="col-span-2 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-[#ff242d]/70">{translateContent(item.nameEn)}</div>
                  <div className="col-span-2 text-center text-[14px] font-bold text-[#ff242d]">
                    {item._count?.dishes || 0} {t((item._count?.dishes || 0) === 1 ? "common.dish" : "dishes.title")}
                  </div>
                  <div className="col-span-2 text-center text-[14px] font-medium text-[#ff242d]/70">{formatDate(item.updatedAt)}</div>
                  <div className="col-span-1 flex items-center justify-center gap-3">
                    <button type="button" className="text-[#ff242d] transition-colors hover:text-[#ea1d26]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="text-[#ff242d]/50 transition-colors hover:text-[#ff242d]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
                      ? "bg-[#cc0000] text-white"
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
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#ff242d]">{modalTitle}</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#ff242d] hover:opacity-70">
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
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
                      <span className="font-medium text-[#ff242d]">{categoryForm.color}</span>
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                      placeholder={t("categoryPage.subCategoryNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.category")}</label>
                    <select
                      value={subCategoryForm.categoryId}
                      onChange={(event) => setSubCategoryForm((current) => ({ ...current, categoryId: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#ff242d]"
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

              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

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
                  className="flex-1 rounded-2xl bg-[#ff242d] py-3 font-semibold text-white hover:bg-[#ea1d26] disabled:opacity-50"
                >
                  {isSaving ? t("common.saving") : activeTab === "categories" ? t("categoryPage.saveCategory") : t("categoryPage.saveSubCategory")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
