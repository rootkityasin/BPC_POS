import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

export default async function CategoryPage() {
  const user = await requireFeatureView(FEATURE_KEYS.CATEGORY);
  const categories = await prisma.category.findMany({
    where: { storeId: user.storeId || undefined },
    orderBy: { displayOrder: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Category</h2>
        <p className="text-sm text-slate-500">Bilingual category setup with manager visibility controlled by per-user overrides.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <Card key={category.id} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{category.nameEn}</div>
                <div className="text-sm text-slate-500">{category.nameBn}</div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{hasManageAccess(user, FEATURE_KEYS.CATEGORY) ? "Editable" : "View only"}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
