"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "Optional";
  return `৳${Number(value).toFixed(2)}`;
}

export function StockClient({ stockItems }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    supplier: "",
    createdBy: "",
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

  const filteredItems = stockItems.filter((item) =>
    (item.name || item.dish?.nameEn || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  function toggleMenu(id) {
    setActiveMenuId(activeMenuId === id ? null : id);
  }

  function resetForm() {
    setFormData({ name: "", quantity: "", supplier: "", createdBy: "", price: "" });
    setError("");
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/v1/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          quantity: Number(formData.quantity || 0),
          supplier: formData.supplier,
          createdBy: formData.createdBy,
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
      <div className="mb-4 mt-8">
        <h2 className="text-[26px] font-bold text-[#ff242d]">{t("stock.title")}</h2>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex h-12 w-80 items-center rounded-xl border border-[#ffeced] bg-white px-4 text-sm text-[#ff242d] shadow-sm">
          <input
            type="text"
            placeholder={t("common.searchInput")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder-[#ff8a90]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="text-[15px] font-bold text-[#ff242d] transition-colors hover:text-[#ea1d26]"
        >
          {t("common.addItem")}
        </button>
      </div>

      <div className="relative z-10 overflow-visible rounded-3xl border border-slate-100 bg-white pb-20 shadow-[0_18px_45px_rgba(15,23,42,0.03)]">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-slate-100/80">
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("stock.name")}</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("common.quantity")}</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("common.price")}</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("common.createdBy")}</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("common.supplier")}</th>
              <th className="px-8 py-5 text-left font-bold text-[#ff242d]">{t("common.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="select-none border-b border-slate-50/50 transition-colors hover:bg-slate-50/50">
                <td className="px-8 py-5 font-semibold text-[#ff242d]">{translateContent(item.name || item.dish?.nameEn)}</td>
                <td className="px-8 py-5 font-medium text-slate-800">{item.quantity}</td>
                <td className="px-8 py-5 font-medium text-slate-800">{formatCurrency(item.price)}</td>
                <td className="px-8 py-5 font-medium text-slate-800">{item.createdBy}</td>
                <td className="px-8 py-5 font-medium text-slate-800">{translateContent(item.supplier)}</td>
                <td className="px-8 py-5">
                  <div className="action-menu-container relative w-max">
                    <button type="button" onClick={() => toggleMenu(item.id)} className="flex w-5 items-start gap-1 text-[#ff242d] hover:opacity-75 focus:outline-none">
                      <div className="h-[2px] w-full rounded-full bg-[#ff242d]" />
                      <div className="h-[2px] w-full rounded-full bg-[#ff242d]" />
                      <div className="h-[2px] w-[60%] rounded-full bg-[#ff242d]" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                        <button type="button" className="mb-1 block w-full rounded-[16px] bg-[#fff5f5] px-5 py-3 text-left text-[14px] font-semibold text-[#ff242d] transition-colors hover:bg-[#ffebeb]">{t("common.edit")}</button>
                        <button type="button" className="block w-full rounded-[16px] px-5 py-3 text-left text-[14px] font-semibold text-[#ff242d] transition-colors hover:bg-slate-50">{t("stock.addMoreItems")}</button>
                        <button type="button" className="block w-full rounded-[16px] px-5 py-3 text-left text-[14px] font-semibold text-[#ff242d] transition-colors hover:bg-slate-50">{t("common.delete")}</button>
                        <button type="button" className="block w-full rounded-[16px] px-5 py-3 text-left text-[14px] font-semibold text-[#ff242d] transition-colors hover:bg-slate-50">{t("common.print")}</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-[#ff242d]">{t("stock.addNewItem")}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("stock.itemName")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("stock.itemNamePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.quantity")}</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(event) => setFormData((current) => ({ ...current, quantity: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("stock.quantityPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("stock.priceOptional")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("stock.pricePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.supplier")}</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(event) => setFormData((current) => ({ ...current, supplier: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("stock.supplierPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.createdBy")}</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(event) => setFormData((current) => ({ ...current, createdBy: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff242d]"
                  placeholder={t("stock.createdByPlaceholder")}
                />
              </div>

              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200">{t("common.cancel")}</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 rounded-2xl bg-[#ff242d] py-3 font-semibold text-white hover:bg-[#ea1d26] disabled:opacity-50">{isSaving ? t("common.saving") : t("stock.saveItem")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
