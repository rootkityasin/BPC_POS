import { I18nText } from "@/components/i18n/i18n-text";
import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getCustomerDashboard } from "@/modules/customers/customer-service";
import { requireFeatureView } from "@/modules/rbac/access";
import { formatCurrency } from "@/lib/utils";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-BD", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

export default async function CustomerPage() {
  const user = await requireFeatureView(FEATURE_KEYS.CUSTOMERS);
  const { customers, totals } = await getCustomerDashboard(user);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="pages.customerTitle" fallback="Customer" /></h2>
        <p className="mt-2 text-sm text-slate-500"><I18nText k="pages.customerSubtitle" fallback="Review store customers, repeat orders, and spend history captured from POS orders." /></p>
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
                        <div className="font-semibold text-slate-900">{order.invoiceNumber}</div>
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
