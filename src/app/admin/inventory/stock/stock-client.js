"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronLeft, ChevronRight, Plus, Package, Loader2 } from "lucide-react";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/ui/modal-shell";
import { SearchBar } from "@/components/ui/search-bar";

const ITEMS_PER_PAGE = 10;

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "Optional";
  return `৳${Math.round(Number(value || 0)).toLocaleString("en-BD")}`;
}

export function StockClient({ stockItems, canCreate = true, canManage = true, showStoreColumn = false }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    nameBn: "",
    quantity: "",
    supplier: "",
    createdBy: "",
    buyingPrice: "",
    price: ""
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest(".action-menu-container")) {
        setActiveMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = stockItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameEn = (item.name || item.dish?.nameEn || "").toLowerCase();
    const nameBn = (item.nameBn || item.dish?.nameBn || "").toLowerCase();
    const supplier = (item.supplier || "").toLowerCase();
    return nameEn.includes(q) || nameBn.includes(q) || supplier.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startIndex = filteredItems.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function toggleMenu(id) {
    setActiveMenuId(activeMenuId === id ? null : id);
  }

  function resetForm() {
    setEditingItem(null);
    setFormData({ name: "", nameBn: "", quantity: "", supplier: "", createdBy: "", buyingPrice: "", price: "" });
    setError("");
  }

  function openAddModal() {
    resetForm();
    setIsAddModalOpen(true);
  }

  function openEditModal(item) {
    setActiveMenuId(null);
    setEditingItem(item);
    setFormData({
      name: item.name || item.dish?.nameEn || "",
      nameBn: item.nameBn || item.dish?.nameBn || "",
      quantity: String(item.quantity ?? ""),
      supplier: item.supplier || "",
      createdBy: item.createdBy || "",
      buyingPrice: item.buyingPrice === null || item.buyingPrice === undefined ? "" : String(item.buyingPrice),
      price: item.price === null || item.price === undefined ? "" : String(item.price)
    });
    setError("");
    setIsAddModalOpen(true);
  }

  async function handleDelete(item) {
    setActiveMenuId(null);

    const itemName = (i18n.language === "bn" && item.nameBn) || item.name || item.dish?.nameEn || "this item";
    if (!window.confirm(`Delete ${itemName}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/v1/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, storeId: item.storeId || item.store?.id || "" })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to delete stock item.");
        return;
      }

      router.refresh();
    } catch {
      alert("Failed to delete stock item.");
    }
  }

  async function handleSave() {
    if (!formData.name.trim() && !formData.nameBn.trim()) {
      setError(i18n.language === "bn" ? "অনুগ্রহ করে আইটেমের নাম লিখুন।" : "Please enter an item name.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/v1/stock", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem?.id,
          storeId: editingItem?.storeId || editingItem?.store?.id || "",
          name: formData.name.trim() || formData.nameBn.trim(),
          nameBn: formData.nameBn.trim() || null,
          quantity: Number(formData.quantity || 0),
          supplier: formData.supplier,
          createdBy: formData.createdBy,
          buyingPrice: formData.buyingPrice === "" ? null : Number(formData.buyingPrice),
          price: formData.price === "" ? null : Number(formData.price)
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Failed to save stock item.");
        return;
      }

      window.dispatchEvent(new Event("bpc:translations-updated"));
      setIsAddModalOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Failed to save stock item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col bg-[#fdfdfd]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="pl-3 pt-1 sm:pl-4">
          <h2 className="text-[26px] font-bold text-slate-900">{t("stock.title")}</h2>
        </div>

        <div className="flex w-full max-w-[620px] items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder={i18n.language === "bn" ? "স্টক আইটেম বা ডিশ অনুসন্ধান করুন..." : "Search stock items or dishes..."}
            />
          </div>
          <button
            type="button"
            onClick={openAddModal}
            disabled={!canCreate}
            className="flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-[#2771cb] px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#13508b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{canCreate ? t("common.addItem") : "Select store"}</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[600px] flex-col overflow-visible rounded-3xl border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.03)]">
        <div className="flex-1">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-slate-100/80">
                <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("stock.name")}</th>
                <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("common.quantity")}</th>
                <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("common.price")}</th>
                <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("common.createdBy")}</th>
                <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("common.supplier")}</th>
                {showStoreColumn ? <th className="px-8 py-5 text-left font-bold text-[#2771cb]">Store</th> : null}
                {canManage ? <th className="px-8 py-5 text-left font-bold text-[#2771cb]">{t("common.action")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="select-none border-b border-slate-50/50 transition-colors hover:bg-slate-50/50">
                  <td className="px-8 py-5">
                    <div className="font-semibold text-[#2771cb]">
                      {i18n.language === "bn" && item.nameBn?.trim()
                        ? item.nameBn
                        : translateContent(item.name || item.dish?.nameEn)}
                    </div>
                    {item.name && item.nameBn && (
                      <div className="mt-0.5 text-xs text-slate-400 font-normal">
                        {i18n.language === "bn" ? item.name : item.nameBn}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-800">{item.quantity}</td>
                  <td className="px-8 py-5">
                    <div className="font-semibold text-slate-800">{formatCurrency(item.price)}</div>
                    {item.buyingPrice !== null && item.buyingPrice !== undefined && item.buyingPrice !== "" && (
                      <div className="mt-0.5 text-xs text-slate-400 font-normal">
                        {i18n.language === "bn" ? `ক্রয়: ${formatCurrency(item.buyingPrice)}` : `Cost: ${formatCurrency(item.buyingPrice)}`}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-800">{item.createdBy}</td>
                  <td className="px-8 py-5 font-medium text-slate-800">{translateContent(item.supplier)}</td>
                  {showStoreColumn ? <td className="px-8 py-5 font-medium text-slate-800">{item.store?.nameEn || "Unknown store"}</td> : null}
                  {canManage ? (
                    <td className="px-8 py-5">
                      <div className="action-menu-container relative w-max">
                        <button type="button" onClick={() => toggleMenu(item.id)} className="flex items-center justify-center text-[#2771cb] hover:opacity-75 focus:outline-none">
                          <Menu className="h-5 w-5" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                            <button type="button" onClick={() => openEditModal(item)} className="mb-1 block w-full rounded-[16px] bg-[#e5f1ff] px-5 py-3 text-left text-[14px] font-semibold text-[#2771cb] transition-colors hover:bg-[#d6e8ff]">{t("common.edit")}</button>
                            <button type="button" onClick={() => handleDelete(item)} className="block w-full rounded-[16px] px-5 py-3 text-left text-[14px] font-semibold text-[#2771cb] transition-colors hover:bg-slate-50">{t("common.delete")}</button>
                          </div>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-slate-100 px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {startIndex}-{endIndex} of {filteredItems.length} items
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    page === currentPage
                      ? "bg-[#2771cb] text-white"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ModalShell
        isOpen={isAddModalOpen}
        maxWidthClass="max-w-lg"
        onBackdropClick={() => setIsAddModalOpen(false)}
      >
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f1ff] text-[#2771cb] shadow-xs">
            <Package className="h-6 w-6" />
          </div>
          <div className="pr-8">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              {editingItem ? t("common.edit") : t("stock.addNewItem")}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {editingItem
                ? (i18n.language === "bn" ? "আইটেমের বিবরণ ও ইনভেন্টরি আপডেট করুন" : "Update stock item specifications and quantity")
                : t("stock.modalSubtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 2 Input Fields for Item Name: 1 for English, 1 for Bangla */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{t("stock.itemNameEn")}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">EN</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                placeholder={t("stock.itemNameEnPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{t("stock.itemNameBn")}</span>
                <span className="rounded-md bg-[#e5f1ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2771cb]">বাংলা</span>
              </label>
              <input
                type="text"
                value={formData.nameBn}
                onChange={(event) => setFormData((current) => ({ ...current, nameBn: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                placeholder={t("stock.itemNameBnPlaceholder")}
              />
            </div>
          </div>

          {/* Buying Price and Selling Price */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{t("stock.buyingPrice")}</span>
                <span className="text-[11px] font-normal text-slate-400 lowercase">
                  ({i18n.language === "bn" ? "ঐচ্ছিক" : "optional"})
                </span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.buyingPrice}
                  onChange={(event) => setFormData((current) => ({ ...current, buyingPrice: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-8 pr-3.5 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                  placeholder={t("stock.buyingPricePlaceholder")}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{t("stock.sellingPrice")}</span>
                <span className="text-[11px] font-normal text-slate-400 lowercase">
                  ({i18n.language === "bn" ? "ঐচ্ছিক" : "optional"})
                </span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-8 pr-3.5 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                  placeholder={t("stock.sellingPricePlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Quantity and Supplier */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {t("common.quantity")}
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(event) => setFormData((current) => ({ ...current, quantity: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                placeholder={t("stock.quantityPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {t("common.supplier")}
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(event) => setFormData((current) => ({ ...current, supplier: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
                placeholder={t("stock.supplierPlaceholder")}
              />
            </div>
          </div>

          {/* Created By */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {t("common.createdBy")}
            </label>
            <input
              type="text"
              value={formData.createdBy}
              onChange={(event) => setFormData((current) => ({ ...current, createdBy: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
              placeholder={t("stock.createdByPlaceholder")}
            />
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3 border-t border-slate-100/90 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200/90 bg-white text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.99]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-[#2771cb] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#13508b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSaving ? t("common.saving") : editingItem ? t("common.save") : t("stock.saveItem")}</span>
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
