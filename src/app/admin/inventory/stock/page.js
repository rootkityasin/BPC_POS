import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  const user = await requireFeatureView(FEATURE_KEYS.STOCK);
  
  // We fetch stock items where dishId is null to show our raw materials (or whatever specific inventory items we just seeded)
  // Or simply fetch them all to match mock if we migrated everything.
  const stockItems = await prisma.stockItem.findMany({
    where: { storeId: user.storeId || undefined },
    include: { dish: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <StockClient stockItems={stockItems} />
  );
}
