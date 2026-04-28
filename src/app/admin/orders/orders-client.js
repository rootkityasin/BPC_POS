"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Printer, Search, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { formatOrderId } from "@/lib/order-id";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { buildReceiptHtml } from "@/modules/receipts/receipt-renderer";
import { openPrintPreview } from "@/modules/receipts/print-preview";
import { buildReportHtml, buildTableSectionHtml, downloadCsv, openPrintWindow } from "@/modules/reports/report-export";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/components/ui/modal-shell";

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

function getItemLabel(item, translateContent) {
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


function OrderRefundModal({ order, onClose, onSave, t, translateContent }) {
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
        .map(([itemId, qty]) => ({ itemId, quantity: qty }));

      const response = await fetch("/api/v1/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, refundItems: itemsToRefund })
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
      <h3 className="text-2xl font-bold text-orange-600">{t("orders.refundOrder", { defaultValue: "Refund Order" })}</h3>
      <p className="mt-2 text-sm text-slate-500">
        {t("orders.refundOrderSubtitle", { orderId: formatOrderId(order.invoiceNumber) || "----", defaultValue: "Select items and quantities to return from this order." })}
      </p>

      {!hasRefundableItems ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
          {t("orders.noRefundableItems", { defaultValue: "All items in this order have been fully refunded." })}
        </div>
      ) : (
        <form onSubmit={handleRefundSubmit} className="mt-6 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left font-medium text-slate-500">
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
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {getItemLabel(item, translateContent)}
                        {isRemoved ? (
                          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                            Removed
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={maxQty}
                            value={currentQty || ""}
                            disabled={isRemoved || isDish}
                            onChange={(e) => handleQuantityChange(item.id, maxQty, e.target.value, isDish)}
                            className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                          />
                          <span className="text-xs text-slate-400">/ {maxQty}</span>
                        </div>
                        {isDish ? (
                          <div className="mt-1 text-xs text-slate-400">Full dish only</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleRemoveItem(item.id, maxQty)}
                          className={`inline-flex items-center justify-center rounded-full border p-2 transition ${isRemoved ? "border-orange-200 bg-orange-50 text-orange-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
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
            <div className="rounded-2xl bg-orange-50 px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">{t("orders.refundAmount", { defaultValue: "Refund Amount" })}</span>
              <span className="text-lg font-bold text-orange-700">{formatCurrency(totalRefundAmount)}</span>
            </div>
          )}

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200">
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={isProcessing || !hasSelection}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
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
  if (!order) return null;

  return (
    <ModalShell
      isOpen
      maxWidthClass="max-w-3xl"
      onBackdropClick={onClose}
    >
      <h3 className="mb-6 text-2xl font-bold text-[#2771cb]">{t("orders.editOrder")}</h3>
      <form className="space-y-6" onSubmit={onSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("orders.customer")}</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                placeholder={t("orders.walkIn")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#2771cb]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("orders.customerPhone")}</label>
              <input
                type="text"
                value={form.customerPhone}
                onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
                placeholder={t("orders.customerPhonePlaceholder")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#2771cb]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("orders.status")}</label>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#2771cb]"
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{getOrderStatusLabel(t, status)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("orders.orderItems")}</h3>
              <span className="text-sm text-slate-500">{order.items.length} {t("orders.items")}</span>
            </div>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div>
                    <div className="font-semibold text-slate-900">{getItemLabel(item, translateContent)}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {t("orders.itemMeta", {
                        quantity: item.quantity,
                        price: formatCurrency(item.unitPrice)
                      })}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{getPrintStatusLabel(t, item.printStatus || "Not Printed")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error ? <div className="rounded-2xl bg-[#e5f1ff] px-4 py-3 text-sm font-medium text-[#13508b]">{error}</div> : null}

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="rounded-2xl bg-[#2771cb] px-5 py-3 font-semibold text-white hover:bg-[#13508b] disabled:opacity-50">
              {saving ? t("common.saving") : t("orders.saveChanges")}
            </button>
          </div>
      </form>
    </ModalShell>
  );
}

export function OrdersClient({ orders: initialOrders, canManage, showStoreColumn = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const rawInvoice = order.invoiceNumber || "";
        const formattedInvoice = formatOrderId(order.invoiceNumber) || "";
        return rawInvoice.toLowerCase().includes(query) || formattedInvoice.toLowerCase().includes(query);
      }
      return true;
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
        "58mm": buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent), { paperWidthOverride: "58mm" }),
        "80mm": buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent), { paperWidthOverride: "80mm" })
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
    const receiptHtml = buildReceiptHtml(order, t, (item) => getItemLabel(item, translateContent), {
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
        .map((item) => `${getItemLabel(item, translateContent)} x${Number(item.quantity || 0)}`)
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
        .map((item) => `${getItemLabel(item, translateContent)} x${Number(item.quantity || 0)}`)
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t("orders.title")}</h2>
          <p className="text-sm text-slate-500">{t("orders.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" className="rounded-2xl" onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
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
                {canManage ? <th className="px-5 py-3 text-right">{t("common.action")}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={(showStoreColumn ? 9 : 8) - (canManage ? 0 : 1)} className="px-5 py-10 text-center text-slate-500">{t("orders.noOrdersYet")}</td>
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
                        <div className="mt-1 text-xs text-slate-500">{order.items.slice(0, 2).map((item) => getItemLabel(item, translateContent)).join(", ")}{order.items.length > 2 ? ` +${order.items.length - 2}` : ""}</div>
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
                      {canManage ? (
                        <td className="px-5 py-4 text-right text-slate-500">
                          <div className="flex items-center justify-end gap-2">
                            <button
                            type="button"
                            onClick={() => openEditModal(order)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#2771cb] px-4 py-2 font-semibold text-white hover:bg-[#13508b]"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("common.edit")}
                            </button>
                            {order.status !== "CANCELLED" ? (
                              <button
                                type="button"
                                onClick={() => setRefundOrder(order)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 font-semibold text-orange-700 hover:bg-orange-100"
                              >
                                <RotateCcw className="h-4 w-4" />
                                {t("orders.refund", { defaultValue: "Refund" })}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
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
