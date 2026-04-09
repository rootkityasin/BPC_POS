import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { I18nText } from "@/components/i18n/i18n-text";
import { formatCurrency } from "@/lib/utils";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

export default async function OrdersPage() {
  const user = await requireFeatureView(FEATURE_KEYS.ORDERS);
  const orders = await prisma.order.findMany({
    where: { storeId: user.storeId || undefined },
    include: { items: { include: { dish: true } } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900"><I18nText k="orders.title" fallback="Orders" /></h2>
        <p className="text-sm text-slate-500"><I18nText k="orders.subtitle" fallback="Omnichannel-style operational table with manager mutability controlled by permission overrides." /></p>
      </div>
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3"><I18nText k="orders.invoice" fallback="Invoice" /></th>
              <th className="px-5 py-3"><I18nText k="orders.customer" fallback="Customer" /></th>
              <th className="px-5 py-3"><I18nText k="orders.status" fallback="Status" /></th>
              <th className="px-5 py-3"><I18nText k="orders.total" fallback="Total" /></th>
              <th className="px-5 py-3"><I18nText k="orders.items" fallback="Items" /></th>
              <th className="px-5 py-3"><I18nText k="common.action" fallback="Action" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-10 text-center text-slate-500"><I18nText k="orders.noOrdersYet" fallback="No orders yet." /></td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 font-semibold text-slate-800">{order.invoiceNumber}</td>
                  <td className="px-5 py-4">{order.customerName || <I18nText k="orders.walkIn" fallback="Walk-in" />}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{order.status}</span></td>
                  <td className="px-5 py-4">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-5 py-4">{order.items.length}</td>
                  <td className="px-5 py-4 text-slate-500">{hasManageAccess(user, FEATURE_KEYS.ORDERS) ? <I18nText k="orders.canUpdate" fallback="Can update" /> : <I18nText k="common.viewOnly" fallback="View only" />}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
