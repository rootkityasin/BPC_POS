import { I18nText } from "@/components/i18n/i18n-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getCustomerDashboard } from "@/modules/customers/customer-service";
import { requireFeatureView } from "@/modules/rbac/access";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { formatCurrency } from "@/lib/utils";
import { formatOrderId } from "@/lib/order-id";

export const dynamic = "force-dynamic";

function sanitizeQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }

  return String(value || "").trim();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-BD", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

export default async function CustomerPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.CUSTOMERS);
  const storeId = await getActiveStoreId(user);
  const filters = {
    invoiceSuffix: sanitizeQueryValue(searchParams?.invoiceSuffix),
    customerName: sanitizeQueryValue(searchParams?.customerName),
    fromDate: sanitizeQueryValue(searchParams?.fromDate),
    toDate: sanitizeQueryValue(searchParams?.toDate)
  };

  const { customers, totals } = await getCustomerDashboard(user, storeId, filters);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="pages.customerTitle" fallback="Customer" /></h2>
        <p className="mt-2 text-sm text-slate-500"><I18nText k="pages.customerSubtitle" fallback="Review store customers, repeat orders, and spend history captured from POS orders." /></p>
      </Card>

      <Card className="p-5">
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px_auto]">
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Invoice No. Last 4</span>
            <input
              name="invoiceSuffix"
              type="text"
              maxLength="4"
              defaultValue={filters.invoiceSuffix}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="e.g. 1024"
            />
          </label>
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Customer Name</span>
            <input
              name="customerName"
              type="text"
              defaultValue={filters.customerName}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="Search by customer name"
            />
          </label>
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">From</span>
            <input
              name="fromDate"
              type="date"
              defaultValue={filters.fromDate}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
            />
          </label>
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">To</span>
            <input
              name="toDate"
              type="date"
              defaultValue={filters.toDate}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
            />
          </label>
          <div className="flex items-end gap-3">
            <Button type="submit" className="rounded-2xl px-5 py-3">Apply</Button>
            <a href="/admin/user/customer" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Clear
            </a>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="pages.customerMetricCustomers" fallback="Customers" /></div>
          <div className="mt-3 text-3xl font-black text-slate-900">{totals.customerCount}</div>
          <div className="mt-2 text-sm text-slate-500"><I18nText k="pages.customerMetricCustomersHint" fallback="Customers with saved name or phone from completed POS entries." /></div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="pages.customerMetricOrders" fallback="Tracked Orders" /></div>
          <div className="mt-3 text-3xl font-black text-slate-900">{totals.orderCount}</div>
          <div className="mt-2 text-sm text-slate-500"><I18nText k="pages.customerMetricOrdersHint" fallback="Orders linked to customer details for this store scope." /></div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="pages.customerMetricRevenue" fallback="Customer Revenue" /></div>
          <div className="mt-3 text-3xl font-black text-slate-900">{formatCurrency(totals.revenue)}</div>
          <div className="mt-2 text-sm text-slate-500"><I18nText k="pages.customerMetricRevenueHint" fallback="Combined spend across tracked customer orders." /></div>
        </Card>
      </div>

      {customers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          <I18nText k="pages.customerEmpty" fallback="Customer records will appear here after POS orders are placed with a customer name or phone number." />
        </Card>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900">{customer.name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{customer.phone || "No phone number"}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{customer.storeName}</span>
                    <span>Last order {formatDate(customer.lastOrderAt)}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orders</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{customer.orderCount}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Spent</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{formatCurrency(customer.totalSpent)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Orders</div>
                    <div className="mt-2 text-xl font-black text-slate-900">{customer.recentOrders.length}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[160px_120px_110px_minmax(0,1fr)] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <div>Invoice</div>
                  <div>Date</div>
                  <div>Total</div>
                  <div>Order Details</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {customer.recentOrders.map((order) => (
                    <div key={order.id} className="grid grid-cols-[160px_120px_110px_minmax(0,1fr)] gap-4 px-5 py-4 text-sm text-slate-600">
                      <div>
                        <div className="font-semibold text-slate-900">{formatOrderId(order.invoiceNumber) || "----"}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{order.status}</div>
                      </div>
                      <div>{formatDate(order.createdAt)}</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</div>
                      <div>
                        <div>{order.itemSummary || "No items"}</div>
                        <div className="mt-1 text-xs text-slate-400">{order.itemCount} item(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
