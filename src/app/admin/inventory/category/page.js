import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { CategoryClient } from "./category-client";

export default async function CategoryPage() {
  const user = await requireFeatureView(FEATURE_KEYS.CATEGORY);
  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const canManageStoreScope = user.role !== "SUPER_ADMIN" || Boolean(storeId);
  const canManageCategories = hasManageAccess(user, FEATURE_KEYS.CATEGORY);
  const canManageSubCategories = hasManageAccess(user, FEATURE_KEYS.SUBCATEGORY);
  
  const [categories, subCategories] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        store: true,
        _count: {
          select: { dishes: true }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.subCategory.findMany({
      where,
      include: {
        store: true,
        category: true,
        _count: {
          select: { dishes: true }
        }
      },
      orderBy: { displayOrder: "asc" }
    })
  ]);

  return (
    <CategoryClient
      categories={categories}
      subCategories={subCategories}
      canManageCategories={canManageCategories}
      canManageSubCategories={canManageSubCategories}
      canCreate={canManageStoreScope}
      showStoreColumn={user.role === "SUPER_ADMIN" && !storeId}
    />
  );
}
