import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/session-service";
import { FEATURE_KEYS, canView } from "@/core/policies/permission-policy";
import { getPosCategories, getPosProducts } from "@/modules/pos/pos-actions";
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
  const categories = await getPosCategories(storeId);
  const products = await getPosProducts(storeId);

  return <PosClient categories={categories} products={products} storeId={storeId} userEmail={sessionUser.email} />;
}
