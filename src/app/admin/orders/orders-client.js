"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { buildReceiptHtml } from "@/modules/receipts/receipt-renderer";
import { openPrintPreview } from "@/modules/receipts/print-preview";
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
    const popup = openPrintPreview({
      title: `Receipt ${order.invoiceNumber}`,
      defaultPaperWidth: order.store?.receiptPaperWidth || "80mm",
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{t("orders.title")}</h2>
        <p className="text-sm text-slate-500">{t("orders.subtitle")}</p>
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
                {canManage ? <th className="px-5 py-3">{t("common.action")}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={(showStoreColumn ? 9 : 8) - (canManage ? 0 : 1)} className="px-5 py-10 text-center text-slate-500">{t("orders.noOrdersYet")}</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const printStatus = getAggregatePrintStatus(order.items);

                  return (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        <div>{order.invoiceNumber}</div>
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
                        <td className="px-5 py-4 text-slate-500">
                          <button
                            type="button"
                            onClick={() => openEditModal(order)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#2771cb] px-4 py-2 font-semibold text-white hover:bg-[#13508b]"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("common.edit")}
                          </button>
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
    </div>
  );
}
