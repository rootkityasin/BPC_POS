import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
  const user = await requireFeatureView(FEATURE_KEYS.ORDERS);
  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };

  const orders = await prisma.order.findMany({
    where,
    include: { store: { include: { terminals: true } }, items: { include: { dish: true, stockItem: true } } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <OrdersClient orders={orders} canManage={hasManageAccess(user, FEATURE_KEYS.ORDERS)} showStoreColumn={user.role === "SUPER_ADMIN" && !storeId} />
  );
}
