import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { DishesClient } from "./dishes-client";

export default async function DishesPage() {
  const user = await requireFeatureView(FEATURE_KEYS.DISHES);
  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const canManageStoreScope = hasManageAccess(user, FEATURE_KEYS.DISHES) && (user.role !== "SUPER_ADMIN" || Boolean(storeId));

  const [dishes, categories, stockItems] = await Promise.all([
    prisma.dish.findMany({
      where,
      include: {
        store: true,
        category: true,
        subCategory: true,
        ingredients: {
          include: { stockItem: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({
      where,
      include: {
        store: true,
        subCategories: {
          orderBy: { displayOrder: "asc" }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.stockItem.findMany({
      where: {
        ...where,
        dishId: null,
        name: { not: null }
      },
      include: { store: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <DishesClient
      dishes={dishes}
      categories={categories}
      stockItems={stockItems}
      canManage={canManageStoreScope}
      showStoreColumn={user.role === "SUPER_ADMIN" && !storeId}
      userEmail={user.email}
    />
  );
}
