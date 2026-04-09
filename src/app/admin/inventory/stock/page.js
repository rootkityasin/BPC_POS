import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

export default async function StockPage() {
  const user = await requireFeatureView(FEATURE_KEYS.STOCK);
  const stock = await prisma.stockItem.findMany({
    where: { storeId: user.storeId || undefined },
    include: { dish: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Stock</h2>
        <p className="text-sm text-slate-500">Operational stock view modeled after the omnichannel inventory workflow.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">Dish</th>
              <th className="px-5 py-3">Quantity</th>
              <th className="px-5 py-3">Low Stock Level</th>
              <th className="px-5 py-3">Manager Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {stock.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-semibold text-slate-800">{item.dish.nameEn}</td>
                <td className="px-5 py-4">{item.quantity}</td>
                <td className="px-5 py-4">{item.lowStockLevel}</td>
                <td className="px-5 py-4">{hasManageAccess(user, FEATURE_KEYS.STOCK) ? "Can update" : "View only"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
