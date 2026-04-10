import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  const user = await requireFeatureView(FEATURE_KEYS.STOCK);
  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const canManageStoreScope = user.role !== "SUPER_ADMIN" || Boolean(storeId);

  const stockItems = await prisma.stockItem.findMany({
    where,
    include: { dish: true, store: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <StockClient stockItems={stockItems} canCreate={canManageStoreScope} showStoreColumn={user.role === "SUPER_ADMIN" && !storeId} />
  );
}
