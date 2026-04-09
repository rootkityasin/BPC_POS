import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/session-service";
import { canManage, canView } from "@/core/policies/permission-policy";

export async function requireAuthenticatedUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireFeatureView(featureKey) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "SUPER_ADMIN" && !canView(user.permissions, featureKey)) {
    redirect("/admin/pos");
  }
  return user;
}

export function hasManageAccess(user, featureKey) {
  if (user.role === "SUPER_ADMIN") return true;
  return canManage(user.permissions, featureKey);
}
