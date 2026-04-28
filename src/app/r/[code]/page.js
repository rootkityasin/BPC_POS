import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderId } from "@/lib/order-id";
import { formatCurrency } from "@/lib/utils";
import { getPublicOrderByCode } from "@/modules/orders/public-order-service";

export const dynamic = "force-dynamic";

function formatDateTime(value, timezone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-BD", {
    timeZone: timezone || "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function maskName(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Walk-in customer";
  if (normalized.length <= 2) return `${normalized.charAt(0)}*`;
  return `${normalized.slice(0, 2)}${"*".repeat(Math.max(2, normalized.length - 2))}`;
}

function maskPhone(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Not provided";
  if (normalized.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, normalized.length - 4))}${normalized.slice(-4)}`;
}

export default async function PublicReceiptPage({ params }) {
  const order = await getPublicOrderByCode(params?.code);
  if (!order) {
    notFound();
  }

  const orderCode = formatOrderId(order.invoiceNumber) || order.invoiceNumber;
  const timezone = order.store?.timezone || "Asia/Dhaka";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Public Receipt</div>
              <h1 className="mt-3 text-3xl font-black text-slate-900">Order {orderCode}</h1>
              <div className="mt-3 text-sm text-slate-500">{order.store?.nameEn || "Store"} • {formatDateTime(order.createdAt, timezone)}</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#order-details" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                Order Details
              </a>
              <Link href={`/r/${encodeURIComponent(order.receiptPublicCode)}/receipt`} target="_blank" className="inline-flex items-center justify-center rounded-2xl bg-[#2f6fc6] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#255ca8]">
                Reprint Receipt
              </Link>
            </div>
          </div>
        </section>

        <section id="order-details" className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
              <div className="mt-2 text-xl font-black text-slate-900">{order.status}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</div>
              <div className="mt-2 text-xl font-black text-slate-900">{maskName(order.customerName)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</div>
              <div className="mt-2 text-xl font-black text-slate-900">{maskPhone(order.customerPhone)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</div>
              <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(order.totalAmount)}</div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_80px_120px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Item</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-200">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_80px_120px] gap-4 px-5 py-4 text-sm text-slate-700">
                  <div>{item.itemName || item.dish?.nameEn || item.stockItem?.name || "Item"}</div>
                  <div className="text-center font-semibold text-slate-900">x{item.quantity}</div>
                  <div className="text-right font-semibold text-slate-900">{formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-slate-900">{formatCurrency(order.subtotalAmount)}</span></div>
              <div className="flex items-center justify-between"><span>VAT</span><span className="font-semibold text-slate-900">{formatCurrency(order.vatAmount)}</span></div>
              <div className="flex items-center justify-between text-base font-black text-slate-900"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
