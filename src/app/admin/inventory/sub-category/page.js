import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { SubCategoryClient } from "./sub-category-client";

export default async function SubCategoryPage() {
  const user = await requireFeatureView(FEATURE_KEYS.SUBCATEGORY);

  const [categories, subCategories] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        _count: { select: { dishes: true } }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.subCategory.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        category: true,
        _count: { select: { dishes: true } }
      },
      orderBy: [{ category: { nameEn: "asc" } }, { displayOrder: "asc" }]
    })
  ]);

  return (
    <SubCategoryClient categories={categories} subCategories={subCategories} />
  );
}
