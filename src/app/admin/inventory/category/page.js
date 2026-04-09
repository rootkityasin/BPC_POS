import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { CategoryClient } from "./category-client";

export default async function CategoryPage() {
  const user = await requireFeatureView(FEATURE_KEYS.CATEGORY);
  
  const [categories, subCategories] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        _count: {
          select: { dishes: true }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.subCategory.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        category: true,
        _count: {
          select: { dishes: true }
        }
      },
      orderBy: { displayOrder: "asc" }
    })
  ]);

  return (
    <CategoryClient categories={categories} subCategories={subCategories} />
  );
}
