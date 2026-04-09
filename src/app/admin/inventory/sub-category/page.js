import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

export default async function SubCategoryPage() {
  const user = await requireFeatureView(FEATURE_KEYS.SUBCATEGORY);
  const subCategories = await prisma.subCategory.findMany({
    where: { storeId: user.storeId || undefined },
    include: { category: true },
    orderBy: [{ category: { nameEn: "asc" } }, { displayOrder: "asc" }]
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Sub-Category</h2>
        <p className="text-sm text-slate-500">Nested category taxonomy for dishes and menu organization.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Sub-Category</th>
              <th className="px-5 py-3">Bangla</th>
              <th className="px-5 py-3">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {subCategories.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4">{item.category.nameEn}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{item.nameEn}</td>
                <td className="px-5 py-4">{item.nameBn}</td>
                <td className="px-5 py-4">{hasManageAccess(user, FEATURE_KEYS.SUBCATEGORY) ? "Editable" : "View only"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
