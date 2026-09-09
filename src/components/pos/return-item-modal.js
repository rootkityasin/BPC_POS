"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { AlertCircle, Lock, RotateCcw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatOrderId } from "@/lib/order-id";

function formatCurrency(value) {
  return `৳${Math.round(Number(value || 0)).toLocaleString("en-BD")}`;
}

export function ReturnItemModal({
  isOpen,
  onClose,
  isManagerOrAdmin = false,
  currentUserEmail = "",
  onReturnSuccess
}) {
  const { t, i18n } = useTranslation();
  const isBangla = i18n.language === "bn";

  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Refund state: { [itemId]: returnQuantity }
  const [returnQuantities, setReturnQuantities] = useState({});

  // Manager auth fields for unauthorized staff
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  function handleResetSearch() {
    setFoundOrder(null);
    setReturnQuantities({});
    setSearchError("");
    setActionError("");
    setManagerEmail("");
    setManagerPassword("");
  }

  async function handleSearchOrder(e) {
    if (e) e.preventDefault();
    const query = invoiceQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError("");
    setFoundOrder(null);
    setReturnQuantities({});

    try {
      const res = await fetch(`/api/v1/orders?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSearchError(data.error || (isBangla ? "অর্ডার অনুসন্ধান ব্যর্থ হয়েছে।" : "Failed to find order."));
        return;
      }

      const orders = data.orders || [];
      if (orders.length === 0) {
        setSearchError(isBangla ? "এই ইনভয়েসের কোনো অর্ডার পাওয়া যায়নি।" : "No order found for this invoice number.");
        return;
      }

      const match = orders.find((o) => o.invoiceNumber === query || formatOrderId(o.invoiceNumber) === query) || orders[0];

      if (match.status === "CANCELLED") {
        setSearchError(isBangla ? "এই অর্ডারটি পূর্বে বাতিল করা হয়েছে।" : "This order has already been cancelled.");
        return;
      }

      const refundableItems = (match.items || []).filter((item) => Number(item.quantity || 0) > 0);
      if (refundableItems.length === 0) {
        setSearchError(isBangla ? "এই অর্ডারের সকল আইটেম ইতিমধ্যে ফেরত নেওয়া হয়েছে।" : "All items in this order have already been returned.");
        return;
      }

      setFoundOrder(match);
    } catch {
      setSearchError(isBangla ? "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।" : "Network error while searching for order.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleQtyChange(itemId, maxQty, nextQty) {
    const parsed = Math.max(0, Math.min(maxQty, Math.floor(Number(nextQty) || 0)));
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: parsed
    }));
  }

  const refundableItems = (foundOrder?.items || []).filter((item) => Number(item.quantity || 0) > 0);

  const totalReturnAmount = refundableItems.reduce((sum, item) => {
    const qty = returnQuantities[item.id] || 0;
    return sum + qty * Number(item.unitPrice || 0);
  }, 0);

  const hasSelectedReturns = Object.values(returnQuantities).some((qty) => Number(qty) > 0);

  async function handleSubmitReturn(e) {
    if (e) e.preventDefault();
    if (!foundOrder || !hasSelectedReturns) return;

    if (!isManagerOrAdmin && (!managerEmail.trim() || !managerPassword)) {
      setActionError(isBangla ? "অনুমোদনের জন্য ম্যানেজার বা অ্যাডমিনের ক্রেডেনশিয়াল দিন।" : "Manager or Admin credentials required for approval.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");

    try {
      const itemsToRefund = Object.entries(returnQuantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([itemId, qty]) => {
          const item = foundOrder.items.find((i) => i.id === itemId);
          return {
            orderItemId: itemId,
            quantity: Number(qty),
            refundAmount: Number(qty) * Number(item?.unitPrice || 0),
            restock: true
          };
        });

      const payload = {
        orderId: foundOrder.id,
        refundItems: itemsToRefund
      };

      if (!isManagerOrAdmin) {
        payload.managerAuth = {
          email: managerEmail.trim(),
          password: managerPassword
        };
      }

      const res = await fetch("/api/v1/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || (isBangla ? "আইটেম ফেরত সম্পন্ন করা যায়নি।" : "Failed to process item return."));
        return;
      }

      if (onReturnSuccess) {
        onReturnSuccess(data.order, data.authorizedBy || currentUserEmail);
      }
      onClose();
    } catch {
      setActionError(isBangla ? "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।" : "Error connecting to server to process return.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <div className="space-y-5">
        {/* Header: Clean, structured typography with right padding to clear close button */}
        <div className="border-b border-slate-100 pb-3 pr-10">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="h-5 w-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-900">
              {isBangla ? "আইটেম ফেরত" : "Item Return"}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isBangla
              ? "আইটেম ফেরত সম্পন্ন করতে ইনভয়েস নম্বর দিয়ে অনুসন্ধান করুন।"
              : "Search by invoice number to process returns and update stock."}
          </p>
        </div>

        {/* Step 1: Invoice Search */}
        {!foundOrder ? (
          <form onSubmit={handleSearchOrder} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                {isBangla ? "ইনভয়েস নম্বর বা অর্ডার আইডি" : "Invoice Number or Order ID"}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isBangla ? "যেমন: 00001 বা INV-..." : "e.g. 00001 or INV-..."}
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-400"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !invoiceQuery.trim()}
                  className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSearching ? (isBangla ? "অনুসন্ধান..." : "Searching...") : (isBangla ? "খুঁজুন" : "Search")}
                </button>
              </div>
            </div>

            {searchError ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            ) : null}
          </form>
        ) : (
          /* Step 2: Order Found & Item Selection */
          <form onSubmit={handleSubmitReturn} className="space-y-4">
            {/* Order Details Header */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
              <div>
                <span className="font-bold text-slate-900">
                  {formatOrderId(foundOrder.invoiceNumber) || "----"}
                </span>
                <span className="ml-2 text-slate-500">
                  • {foundOrder.customerName || (isBangla ? "ওয়াক-ইন কাস্টমার" : "Walk-in")}
                </span>
                <span className="ml-2 text-slate-400">
                  • {new Date(foundOrder.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                {isBangla ? "অন্য অর্ডার" : "Change Order"}
              </button>
            </div>

            {/* Refund Items Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">{isBangla ? "আইটেম" : "Item"}</th>
                    <th className="px-3.5 py-2.5">{isBangla ? "মূল্য" : "Price"}</th>
                    <th className="px-3.5 py-2.5">{isBangla ? "ক্রয় পরিমাণ" : "Bought"}</th>
                    <th className="px-3.5 py-2.5 text-right">{isBangla ? "ফেরত সংখ্যা" : "Return Qty"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {refundableItems.map((item) => {
                    const maxQty = Number(item.quantity || 0);
                    const currentReturnQty = returnQuantities[item.id] || 0;
                    const itemDisplayName =
                      isBangla && (item.dish?.nameBn || item.stockItem?.nameBn || item.nameBn)
                        ? item.dish?.nameBn || item.stockItem?.nameBn || item.nameBn
                        : item.itemName || "Item";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">
                          {itemDisplayName}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{maxQty}</td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, maxQty, currentReturnQty - 1)}
                              className="h-6 w-6 rounded border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxQty}
                              value={currentReturnQty}
                              onChange={(e) => handleQtyChange(item.id, maxQty, e.target.value)}
                              className="h-6 w-11 rounded border border-slate-200 text-center text-xs font-semibold text-slate-800 outline-none focus:border-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, maxQty, currentReturnQty + 1)}
                              className="h-6 w-6 rounded border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, maxQty, currentReturnQty === maxQty ? 0 : maxQty)}
                              className="ml-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2"
                            >
                              {currentReturnQty === maxQty ? (isBangla ? "মুছুন" : "Clear") : (isBangla ? "সব" : "All")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Refund Amount Card */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="text-xs font-medium text-slate-600">
                {isBangla ? "মোট ফেরতযোগ্য অর্থ:" : "Total Refund Amount:"}
              </span>
              <span className="text-base font-bold text-slate-900">
                {formatCurrency(totalReturnAmount)}
              </span>
            </div>

            {/* Step 3: Manager Authentication for unauthorized staff */}
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

            {actionError ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {isBangla ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasSelectedReturns}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-black transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  {isSubmitting
                    ? (isBangla ? "প্রসেসিং..." : "Processing...")
                    : (isBangla ? "ফেরত সম্পন্ন করুন" : "Confirm Return")}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
