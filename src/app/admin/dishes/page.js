import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { DishesClient } from "./dishes-client";

export default async function DishesPage() {
  const user = await requireFeatureView(FEATURE_KEYS.DISHES);

  const [dishes, categories, stockItems] = await Promise.all([
    prisma.dish.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        category: true,
        subCategory: true,
        ingredients: {
          include: { stockItem: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({
      where: { storeId: user.storeId || undefined },
      include: {
        subCategories: {
          orderBy: { displayOrder: "asc" }
        }
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.stockItem.findMany({
      where: {
        storeId: user.storeId || undefined,
        dishId: null,
        name: { not: null }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <DishesClient
      dishes={dishes}
      categories={categories}
      stockItems={stockItems}
      canManage={hasManageAccess(user, FEATURE_KEYS.DISHES)}
    />
  );
}
