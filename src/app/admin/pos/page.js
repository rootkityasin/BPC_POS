import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/session-service";
import { FEATURE_KEYS, canView } from "@/core/policies/permission-policy";
import { getPosCategories, getPosProducts } from "@/modules/pos/pos-actions";
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

  const storeId = sessionUser.storeId;
  if (!storeId) {
    redirect("/admin/settings/store");
  }

  const [categories, products, store] = await Promise.all([
    getPosCategories(storeId),
    getPosProducts(storeId),
    prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        nameEn: true,
        logoUrl: true,
        location: true,
        vatNumber: true,
        vatPercentage: true
      }
    })
  ]);

  return <PosClient categories={categories} products={products} storeId={storeId} userEmail={sessionUser.email} store={store} />;
}
