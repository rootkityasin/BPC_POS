import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/session-service";
import { FEATURE_KEYS, canView } from "@/core/policies/permission-policy";
import { getPosCategories, getPosProducts } from "@/modules/pos/pos-actions";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { prisma } from "@/lib/prisma";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const sessionUser = await getSessionUser();
  
  if (!sessionUser) {
    redirect("/login");
  }

  if (sessionUser.role !== "SUPER_ADMIN" && !canView(sessionUser.permissions, FEATURE_KEYS.POS)) {
    redirect("/admin/dashboard");
  }

  const storeId = await getActiveStoreId(sessionUser);
  if (!storeId && sessionUser.role !== "SUPER_ADMIN") {
    redirect("/admin/settings/store");
  }

  const [categories, products, store, stores] = await Promise.all([
    getPosCategories(storeId),
    getPosProducts(storeId),
    storeId
      ? prisma.store.findUnique({
          where: { id: storeId },
          select: {
            id: true,
            nameEn: true,
            logoUrl: true,
            location: true,
            vatNumber: true,
            vatPercentage: true,
            receiptPaperWidth: true,
            receiptTheme: true,
            receiptFontSize: true,
            receiptAccentColor: true,
            receiptHeaderText: true,
            receiptFooterText: true,
            receiptShowLogo: true,
            receiptShowSeller: true,
            receiptShowBuyer: true,
            receiptShowOrderStatus: true,
            receiptShowItemNotes: true,
            receiptShowQr: true,
            receiptShowSign: true,
            receiptWatermark: true,
            terminals: true
          }
        })
      : Promise.resolve(null),
    sessionUser.role === "SUPER_ADMIN"
      ? prisma.store.findMany({
          orderBy: { nameEn: "asc" },
          select: { id: true, nameEn: true, vatPercentage: true }
        })
      : Promise.resolve([])
  ]);

  return <PosClient categories={categories} products={products} storeId={storeId} userEmail={sessionUser.email} store={store} stores={stores} activeStoreId={storeId} />;
}
