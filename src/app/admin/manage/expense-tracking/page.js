import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getExpenseTrackerData } from "@/modules/expenses/expense-service";
import { ExpenseTrackingClient } from "./expense-tracking-client";

export const dynamic = "force-dynamic";

function sanitizeQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

export default async function ExpenseTrackingPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.EXPENSES);
  const activeStoreId = await getActiveStoreId(user);
  const resolvedSearchParams = await searchParams;
  const data = await getExpenseTrackerData(user, activeStoreId, {
    from: sanitizeQueryValue(resolvedSearchParams?.from),
    to: sanitizeQueryValue(resolvedSearchParams?.to),
    type: sanitizeQueryValue(resolvedSearchParams?.type)
  });

  return <ExpenseTrackingClient data={data} canManage={hasManageAccess(user, FEATURE_KEYS.EXPENSES)} />;
}
