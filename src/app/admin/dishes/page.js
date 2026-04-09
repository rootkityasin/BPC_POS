import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

export default async function DishesPage() {
  const user = await requireFeatureView(FEATURE_KEYS.DISHES);
  const dishes = await prisma.dish.findMany({
    where: { storeId: user.storeId || undefined },
    include: { category: true, subCategory: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Dishes</h2>
        <p className="text-sm text-slate-500">Restaurant-first product module with EN/BN fields and taxonomy links.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {dishes.map((dish) => (
          <Card key={dish.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">{dish.nameEn}</div>
                <div className="text-sm text-slate-500">{dish.nameBn}</div>
                <div className="mt-3 text-xs text-slate-500">{dish.category.nameEn} / {dish.subCategory?.nameEn || "Unassigned"}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-800">{formatCurrency(dish.price)}</div>
                <div className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{hasManageAccess(user, FEATURE_KEYS.DISHES) ? "Editable" : "View only"}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
