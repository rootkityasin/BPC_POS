"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Printer, RotateCcw, X, Lock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatOrderId } from "@/lib/order-id";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { buildReceiptHtml } from "@/modules/receipts/receipt-renderer";
import { openPrintPreview } from "@/modules/receipts/print-preview";
import { buildReportHtml, buildTableSectionHtml, downloadCsv, openPrintWindow } from "@/modules/reports/report-export";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/ui/modal-shell";
import { SearchBar } from "@/components/ui/search-bar";
import { Select } from "@/components/ui/select";

const ORDER_STATUS_OPTIONS = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"];
function getAggregatePrintStatus(items) {
  if (items.length === 0 || items.every((item) => item.printStatus === "Printed")) {
    return "Printed";
  }

  if (items.every((item) => item.printStatus !== "Printed")) {
    return "Not Printed";
  }

  return "Partial";
}

function getOrderStatusClasses(status) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-[#e5f1ff] text-[#13508b]";
    case "PROCESSING":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPrintStatusClasses(status) {
  switch (status) {
    case "Printed":
      return "bg-emerald-50 text-emerald-700";
    case "Partial":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getOrderStatusLabel(t, status) {
  return t(`orders.statusValues.${String(status || "pending").toLowerCase()}`, { defaultValue: status });
}

function getPrintStatusLabel(t, status) {
  if (status === "Printed") return t("orders.printStatusValues.printed");
  if (status === "Partial") return t("orders.printStatusValues.partial");
  return t("orders.printStatusValues.notPrinted");
}

function getItemLabel(item, translateContent, isBn = false) {
  if (isBn && (item.dish?.nameBn?.trim() || item.stockItem?.nameBn?.trim() || item.nameBn?.trim())) {
    return item.dish?.nameBn?.trim() || item.stockItem?.nameBn?.trim() || item.nameBn?.trim();
  }
  return translateContent(item.dish?.nameEn || item.stockItem?.name || item.itemName || "Item");
}

function isOrderUpdated(order) {
  if (!order?.createdAt || !order?.updatedAt) return false;
  const createdAt = new Date(order.createdAt);
  const updatedAt = new Date(order.updatedAt);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) return false;
  return updatedAt.getTime() - createdAt.getTime() > 1000;
}

function printHtmlDirect(html) {
  if (typeof window === "undefined" || !html) return false;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
  };

  const frameDocument = iframe.contentWindow?.document;
  if (!frameDocument) {
    cleanup();
    return false;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    cleanup();
    return false;
  }

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(cleanup, 1000);
  }, 80);

  return true;
}


function OrderRefundModal({ order, onClose, onSave, t, translateContent, canManage = false }) {
  const { i18n } = useTranslation();
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [refundData, setRefundData] = useState({});
  const [removedItems, setRemovedItems] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  if (!order) return null;

  const refundableItems = order.items.filter(item => (item.quantity || 0) > 0);
  const hasRefundableItems = refundableItems.length > 0;
  
  const handleQuantityChange = (itemId, maxQty, value, isDish) => {
    if (isDish) return;
    const qty = Math.max(0, Math.min(maxQty, parseInt(value || "0", 10)));
    setRefundData(prev => ({ ...prev, [itemId]: qty }));
    setRemovedItems((prev) => {
      if (!prev[itemId]) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const toggleRemoveItem = (itemId, maxQty) => {
    const shouldRemove = !removedItems[itemId];

    setRemovedItems((prev) => {
      const next = { ...prev };
      if (shouldRemove) {
        next[itemId] = true;
      } else {
        delete next[itemId];
      }
      return next;
    });

    setRefundData((prev) => ({
      ...prev,
      [itemId]: shouldRemove ? maxQty : 0
    }));
  };

  const totalRefundAmount = refundableItems.reduce((sum, item) => {
    return sum + (refundData[item.id] || 0) * (item.unitPrice || 0);
  }, 0);

  const hasSelection = Object.values(refundData).some(qty => qty > 0);

  async function handleRefundSubmit(e) {
    e.preventDefault();
    if (!hasSelection) return;
    
    setIsProcessing(true);
    setError("");

    try {
      const itemsToRefund = Object.entries(refundData)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = refundableItems.find((entry) => entry.id === itemId);

          return {
            itemId,
            stockItemId: item?.stockItemId || null,
            dishId: item?.dishId || null,
            quantity: Number(qty)
          };
        });

      const payload = {
        orderId: order.id,
        refundItems: itemsToRefund
      };

      if (!canManage) {
        if (!managerEmail.trim() || !managerPassword) {
          setError("Manager or Admin authorization is required. Please enter manager credentials.");
          setIsProcessing(false);
          return;
        }
        payload.managerAuth = {
          email: managerEmail.trim(),
          password: managerPassword
        };
      }

      const response = await fetch("/api/v1/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || t("orders.refundFailed", { defaultValue: "Failed to process refund." }));
        return;
      }

      onSave(data.order);
    } catch (err) {
      setError(t("orders.refundFailed", { defaultValue: "Failed to process refund." }));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <ModalShell isOpen maxWidthClass="max-w-2xl" onBackdropClick={onClose}>
      <div className="mb-6 flex items-start gap-4 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f1ff] text-[#2771cb] shadow-xs">
          <RotateCcw className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">
            {t("orders.refundOrder", { defaultValue: "Refund Order" })}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {t("orders.refundOrderSubtitle", { orderId: formatOrderId(order.invoiceNumber) || "----", defaultValue: "Select items and quantities to return from this order." })}
          </p>
        </div>
      </div>

      {!hasRefundableItems ? (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-sm font-medium text-slate-500">
          {t("orders.noRefundableItems", { defaultValue: "All items in this order have been fully refunded." })}
        </div>
      ) : (
        <form onSubmit={handleRefundSubmit} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/75 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Return Qty</th>
                  <th className="px-4 py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {refundableItems.map(item => {
                  const maxQty = item.quantity || 0;
                  const currentQty = refundData[item.id] || 0;
                  const isRemoved = Boolean(removedItems[item.id]);
                  const isDish = Boolean(item.dishId);
                  
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800" data-no-translate="true">
                        {getItemLabel(item, translateContent, i18n?.language === "bn")}
                        {isRemoved ? (
                          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
                            Removed
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={maxQty}
                            value={currentQty || ""}
                            disabled={isRemoved || isDish}
                            onChange={(e) => handleQuantityChange(item.id, maxQty, e.target.value, isDish)}
                            className="h-9 w-20 rounded-xl border border-slate-200/90 bg-slate-50/50 px-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15 disabled:opacity-50"
                          />
                          <span className="text-xs font-medium text-slate-400">/ {maxQty}</span>
                        </div>
                        {isDish ? (
                          <div className="mt-1 text-[11px] font-medium text-slate-400">Full dish only</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleRemoveItem(item.id, maxQty)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                            isRemoved
                              ? "border-rose-200 bg-rose-50 text-rose-600"
                              : "border-slate-200/80 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-700"
                          }`}
                          aria-label="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasSelection && (
            <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-[#e5f1ff]/60 px-5 py-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2771cb]">{t("orders.refundAmount", { defaultValue: "Refund Amount" })}</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(totalRefundAmount)}</span>
            </div>
          )}

          {!canManage ? (
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Lock className="h-4 w-4 text-amber-700" />
                <span>Manager or Admin Authorization Required</span>
              </div>
              <p className="text-xs text-amber-800">
                To confirm this item return, enter credentials of an authorized Store Manager or Super Admin:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  placeholder="Manager / Admin Email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="h-10 rounded-xl border border-amber-200/90 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#2771cb] focus:ring-2 focus:ring-[#2771cb]/15"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  className="h-10 rounded-xl border border-amber-200/90 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#2771cb] focus:ring-2 focus:ring-[#2771cb]/15"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Authorized: Manager / Super Admin Direct Permission</span>
            </div>
          )}

          {error && <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">{error}</div>}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100/90 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.99]"
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={isProcessing || !hasSelection}
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#2771cb] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#13508b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? t("common.processing", { defaultValue: "Processing..." }) : t("orders.processRefund", { defaultValue: "Process Refund" })}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function EditOrderModal({ order, form, setForm, onClose, onSave, saving, error, t, translateContent }) {
  const { i18n } = useTranslation();
  if (!order) return null;

  return (
    <ModalShell
      isOpen
      maxWidthClass="max-w-3xl"
      onBackdropClick={onClose}
    >
      <div className="mb-6 flex items-start gap-4 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f1ff] text-[#2771cb] shadow-xs">
          <Pencil className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900">
            {t("orders.editOrder")}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {order.invoiceNumber ? `Invoice #${formatOrderId(order.invoiceNumber)}` : "Update customer and order details"}
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSave}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t("orders.customer")}</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              placeholder={t("orders.walkIn")}
              className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t("orders.customerPhone")}</label>
            <input
              type="text"
              value={form.customerPhone}
              onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
              placeholder={t("orders.customerPhonePlaceholder")}
              className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t("orders.status")}</label>
          <Select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            wrapperClassName="w-full"
            className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-[14px] font-semibold text-slate-800 outline-none transition-all duration-150 focus:border-[#2771cb] focus:bg-white focus:ring-2 focus:ring-[#2771cb]/15"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{getOrderStatusLabel(t, status)}</option>
            ))}
          </Select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">{t("orders.orderItems")}</label>
            <span className="text-xs font-medium text-slate-400">{order.items.length} {t("orders.items")}</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 transition-colors hover:border-slate-300">
                <div>
                  <div className="text-sm font-semibold text-slate-900" data-no-translate="true">
                    {getItemLabel(item, translateContent, i18n?.language === "bn")}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t("orders.itemMeta", {
                      quantity: item.quantity,
                      price: formatCurrency(item.unitPrice)
                    })}
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-400">
                  {getPrintStatusLabel(t, item.printStatus || "Not Printed")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">{error}</div> : null}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100/90 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.99]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#2771cb] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#13508b] active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("orders.saveChanges")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function OrdersClient({ orders: initialOrders, canManage, showStoreColumn = false }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      const rawInvoice = (order.invoiceNumber || "").toLowerCase();
      const formattedInvoice = (formatOrderId(order.invoiceNumber) || "").toLowerCase();
      const customerName = (order.customerName || "").toLowerCase();
      const customerPhone = (order.customerPhone || "").toLowerCase();

      return (
        rawInvoice.includes(query) ||
        formattedInvoice.includes(query) ||
        customerName.includes(query) ||
        customerPhone.includes(query)
      );
    });
  }, [orders, searchQuery]);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", status: "PENDING" });
  const [modalError, setModalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  function syncOrder(updatedOrder) {
    setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    startTransition(() => router.refresh());
  }

  function openEditModal(order) {
    setSelectedOrder(order);
    setForm({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      status: order.status || "PENDING"
    });
    setModalError("");
  }

  function closeEditModal() {
    setSelectedOrder(null);
    setModalError("");
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedOrder) return;

    setIsSaving(true);
    setModalError("");

    try {
      const response = await fetch("/api/v1/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          status: form.status
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setModalError(data.error || t("orders.updateFailed"));
        return;
      }

      syncOrder(data.order);
      closeEditModal();
    } catch {
      setModalError(t("orders.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePrint(order) {
    const orderCode = formatOrderId(order.invoiceNumber) || "----";

    const popup = openPrintPreview({
      title: `Receipt ${orderCode}`,
      defaultPaperWidth: order.store?.receiptPaperWidth || "58mm",
      printers: order.store?.terminals || [],
      previews: {
        "58mm": buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent, i18n?.language === "bn"), { paperWidthOverride: "58mm" }),
        "80mm": buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent, i18n?.language === "bn"), { paperWidthOverride: "80mm" })
      }
    }, {
      onPrint: async () => {
        if (!canManage || order.items.every((item) => item.printStatus === "Printed")) {
          return;
        }

        setPrintingOrderId(order.id);

        try {
          const response = await fetch("/api/v1/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              itemPrintStatuses: order.items.map((item) => ({ itemId: item.id, printStatus: "Printed" }))
            })
          });
          const data = await response.json().catch(() => ({}));

          if (response.ok && data.order) {
            syncOrder(data.order);
          }
        } finally {
          setPrintingOrderId(null);
        }
      }
    });

    if (!popup) {
      window.alert(t("orders.popupBlocked"));
      return;
    }
  }

  async function handlePrintUpdated(order) {
    const receiptPaperWidth = order.store?.receiptPaperWidth || "58mm";
    const receiptHtml = buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent, i18n?.language === "bn"), {
      paperWidthOverride: receiptPaperWidth,
      forceUpdated: true,
      updatedAtOverride: order.updatedAt
    });

    const printed = printHtmlDirect(receiptHtml);
    if (!printed) {
      window.alert(t("orders.popupBlocked"));
    }
  }

  function buildOrdersCsvRows() {
    const header = [
      "Invoice",
      "Created At",
      "Customer",
      "Phone",
      "Status",
      "Print Status",
      ...(showStoreColumn ? ["Store"] : []),
      "Total",
      "Items"
    ];

    const rows = filteredOrders.map((order) => {
      const printStatus = getAggregatePrintStatus(order.items);
      const itemsLabel = order.items
        .map((item) => `${getItemLabel(item, translateContent, i18n?.language === "bn")} x${Number(item.quantity || 0)}`)
        .join("; ");

      return [
        formatOrderId(order.invoiceNumber) || "----",
        new Date(order.createdAt).toLocaleString(),
        order.customerName || t("orders.walkIn"),
        order.customerPhone || t("orders.noCustomerPhone"),
        getOrderStatusLabel(t, order.status),
        getPrintStatusLabel(t, printStatus),
        ...(showStoreColumn ? [order.store?.nameEn || "Unknown store"] : []),
        formatCurrency(order.totalAmount),
        itemsLabel
      ];
    });

    return [header, ...rows];
  }

  function buildOrdersPdfHtml() {
    const totalSales = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const summaryRows = [
      ["Total Orders", String(filteredOrders.length)],
      ["Total Sales", formatCurrency(totalSales)]
    ];

    const columns = [
      "Invoice",
      "Created At",
      "Customer",
      "Phone",
      "Status",
      "Print Status",
      ...(showStoreColumn ? ["Store"] : []),
      "Total",
      "Items"
    ];

    const rows = filteredOrders.map((order) => {
      const printStatus = getAggregatePrintStatus(order.items);
      const itemsLabel = order.items
        .map((item) => `${getItemLabel(item, translateContent, i18n?.language === "bn")} x${Number(item.quantity || 0)}`)
        .join("; ");

      return [
        formatOrderId(order.invoiceNumber) || "----",
        new Date(order.createdAt).toLocaleString(),
        order.customerName || t("orders.walkIn"),
        order.customerPhone || t("orders.noCustomerPhone"),
        getOrderStatusLabel(t, order.status),
        getPrintStatusLabel(t, printStatus),
        ...(showStoreColumn ? [order.store?.nameEn || "Unknown store"] : []),
        formatCurrency(order.totalAmount),
        itemsLabel
      ];
    });

    const sections = [
      buildTableSectionHtml({
        title: "Summary",
        columns: ["Metric", "Value"],
        rows: summaryRows
      }),
      buildTableSectionHtml({
        title: "Orders",
        columns,
        rows
      })
    ];

    return buildReportHtml({
      title: t("orders.title"),
      subtitle: t("orders.subtitle"),
      metaLines: [
        `Generated: ${new Date().toLocaleString()}`,
        `Orders Included: ${filteredOrders.length}`
      ],
      sections
    });
  }

  function handleExportCsv() {
    downloadCsv("orders.csv", buildOrdersCsvRows());
  }

  function handleExportPdf() {
    const html = buildOrdersPdfHtml();
    const popup = openPrintWindow({ title: t("orders.title"), html });
    if (!popup) {
      window.alert("Popup blocked. Please allow popups to export PDF.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-slate-900">{t("orders.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("orders.subtitle")}</p>
        </div>

        <div className="flex w-full max-w-[620px] items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder={i18n?.language === "bn" ? "ইনভয়েস বা কাস্টমার দিয়ে খুঁজুন..." : "Search by invoice or customer..."}
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
          >
            <Printer className="h-4 w-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("orders.invoice")}</th>
                <th className="px-5 py-3">{t("orders.customer")}</th>
                <th className="px-5 py-3">{t("orders.status")}</th>
                <th className="px-5 py-3">{t("orders.printStatus")}</th>
                {showStoreColumn ? <th className="px-5 py-3">Store</th> : null}
                <th className="px-5 py-3">{t("orders.total")}</th>
                <th className="px-5 py-3">{t("orders.items")}</th>
                <th className="px-5 py-3">{t("orders.printReceipt")}</th>
                <th className="px-5 py-3 text-right">{t("common.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={showStoreColumn ? 9 : 8} className="px-5 py-10 text-center text-slate-500">{searchQuery ? t("orders.noSearchResults") : t("orders.noOrdersYet")}</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const printStatus = getAggregatePrintStatus(order.items);

                  return (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        <div>{formatOrderId(order.invoiceNumber) || "----"}</div>
                        <div className="mt-1 text-xs font-normal text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{order.customerName || t("orders.walkIn")}</div>
                        <div className="mt-1 text-xs text-slate-500">{order.customerPhone || t("orders.noCustomerPhone")}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClasses(order.status)}`}>
                          {getOrderStatusLabel(t, order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPrintStatusClasses(printStatus)}`}>
                          {getPrintStatusLabel(t, printStatus)}
                        </span>
                      </td>
                      {showStoreColumn ? <td className="px-5 py-4 text-slate-600">{order.store?.nameEn || "Unknown store"}</td> : null}
                      <td className="px-5 py-4">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{order.items.length}</div>
                        <div className="mt-1 text-xs text-slate-500" data-no-translate="true">{order.items.slice(0, 2).map((item) => getItemLabel(item, translateContent, i18n?.language === "bn")).join(", ")}{order.items.length > 2 ? ` +${order.items.length - 2}` : ""}</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handlePrint(order)}
                          disabled={printingOrderId === order.id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Printer className="h-4 w-4" />
                          {printingOrderId === order.id ? t("common.processing") : t("orders.printReceipt")}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500">
                        <div className="flex items-center justify-end gap-2">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(order)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#2771cb] px-4 py-2 font-semibold text-white hover:bg-[#13508b]"
                            >
                              <Pencil className="h-4 w-4" />
                              {t("common.edit")}
                            </button>
                          ) : null}
                          {order.status !== "CANCELLED" ? (
                            <button
                              type="button"
                              onClick={() => setRefundOrder(order)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 font-semibold text-orange-700 hover:bg-orange-100"
                              title={canManage ? "Refund / Return item" : "Refund (Requires Manager Authorization)"}
                            >
                              {canManage ? <RotateCcw className="h-4 w-4" /> : <Lock className="h-4 w-4 text-amber-600" />}
                              {t("orders.refund", { defaultValue: "Refund" })}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <EditOrderModal
        order={selectedOrder}
        form={form}
        setForm={setForm}
        onClose={closeEditModal}
        onSave={handleSave}
        saving={isSaving}
        error={modalError}
        t={t}
        translateContent={translateContent}
      />
      <OrderRefundModal
        order={refundOrder}
        canManage={canManage}
        onClose={() => setRefundOrder(null)}
        onSave={(updatedOrder) => {
          syncOrder(updatedOrder);
          setRefundOrder(null);
          handlePrintUpdated(updatedOrder);
        }}
        t={t}
        translateContent={translateContent}
      />
    </div>
  );
}
