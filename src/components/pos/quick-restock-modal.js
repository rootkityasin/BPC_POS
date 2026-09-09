"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { AlertCircle, Lock, PackagePlus, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function QuickRestockModal({
  isOpen,
  onClose,
  lowStockItems = [],
  storeId,
  isManagerOrAdmin = false,
  onSuccess
}) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const isBangla = i18n.language === "bn";

  // State: { [productId]: addQuantity }
  const [restockQuantities, setRestockQuantities] = useState(() => {
    const initial = {};
    for (const item of lowStockItems) {
      initial[item.id] = 10;
    }
    return initial;
  });

  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleQtyChange(itemId, value) {
    const parsed = Math.max(0, parseInt(value || 0, 10));
    setRestockQuantities((prev) => ({
      ...prev,
      [itemId]: parsed
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const itemsToRestock = lowStockItems
      .filter((item) => Number(restockQuantities[item.id] || 0) > 0)
      .map((item) => ({
        id: item.id,
        productId: item.productId || item.id,
        productType: item.productType,
        stockItemId: item.stockItemId,
        addQuantity: Number(restockQuantities[item.id] || 0),
        storeId: item.storeId || storeId
      }));

    if (itemsToRestock.length === 0) {
      setError(isBangla ? "কমপক্ষে একটি পণ্যের স্টক যোগ করার পরিমাণ নির্ধারণ করুন।" : "Please specify quantity to add for at least one item.");
      return;
    }

    if (!isManagerOrAdmin && (!managerEmail.trim() || !managerPassword)) {
      setError(isBangla ? "ম্যানেজার বা অ্যাডমিন ক্রেডেনশিয়াল দিন।" : "Manager or Admin credentials required for approval.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        storeId,
        items: itemsToRestock
      };

      if (!isManagerOrAdmin) {
        payload.managerAuth = {
          email: managerEmail.trim(),
          password: managerPassword
        };
      }

      const res = await fetch("/api/v1/stock/quick-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (isBangla ? "স্টক আপডেট ব্যর্থ হয়েছে।" : "Failed to restock items."));
        return;
      }

      try {
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        console.error("onSuccess callback error:", err);
      }
      onClose();
    } catch (err) {
      console.error("Quick restock error:", err);
      setError(isBangla ? "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।" : "Network error while restocking items.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoToInventory() {
    onClose();
    router.push("/admin/inventory/stock");
  }

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4 pr-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f1ff] text-[#2771cb] shadow-xs">
            <PackagePlus className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              {isBangla ? "স্টক বৃদ্ধি করুন" : "Add Stock / Restock"}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {isBangla
                ? "কম স্টক থাকা পণ্যে দ্রুত নতুন স্টক যোগ করুন এবং সংরক্ষণ করুন।"
                : "Quickly increase inventory quantity for low-stock items."}
            </p>
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700">
            {isBangla ? "কম স্টক থাকা পণ্যসমূহ:" : "Items Requiring Restock:"}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {lowStockItems.map((item) => {
              const addQty = restockQuantities[item.id] ?? 10;
              const displayName = isBangla && item.nameBn?.trim() ? item.nameBn : item.nameEn;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{displayName}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {isBangla ? "বর্তমান স্টক:" : "Current Stock:"}{" "}
                      <span className="font-semibold text-slate-700">{item.stock ?? 0}</span>
                      <span className="text-slate-400"> (সীমা: {item.lowStockLevel ?? 5})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold text-slate-500">{isBangla ? "নতুন স্টক যোগ:" : "Add Quantity:"}</span>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-[#2771cb] focus-within:ring-1 focus-within:ring-[#2771cb]">
                      <span className="pl-3 text-xs font-bold text-slate-400">+</span>
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        className="h-9 w-20 rounded-r-xl bg-transparent px-2 text-center text-sm font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manager Auth for Unauthorized Staff */}
        {!isManagerOrAdmin ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {isBangla ? "ম্যানেজার বা অ্যাডমিন অনুমোদন প্রয়োজন" : "Manager or Admin Authorization Required"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                placeholder={isBangla ? "ম্যানেজার ইমেইল" : "Manager Email"}
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-slate-400"
                required
              />
              <input
                type="password"
                placeholder={isBangla ? "পাসওয়ার্ড" : "Password"}
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100/90 pt-3">
          <button
            type="button"
            onClick={handleGoToInventory}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
          >
            <span>{isBangla ? "সম্পূর্ণ স্টক ব্যবস্থাপনা" : "Open Stock Inventory"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.99]"
            >
              {isBangla ? "বাতিল" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2771cb] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#13508b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? (isBangla ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                  : (isBangla ? "স্টক সংরক্ষণ করুন" : "Save Stock")}
              </span>
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
