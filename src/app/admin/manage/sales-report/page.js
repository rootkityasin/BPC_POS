import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { requireFeatureView } from "@/modules/rbac/access";
import { getSalesReportDashboard } from "@/modules/reports/sales-report-service";
import { SalesReportClient } from "./sales-report-client";

export const dynamic = "force-dynamic";

function sanitizeQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

export default async function SalesReportPage({ searchParams }) {
  const user = await requireFeatureView(FEATURE_KEYS.REPORTS);
  const activeStoreId = await getActiveStoreId(user);
  const resolvedSearchParams = await searchParams;
  const filters = {
    range: sanitizeQueryValue(resolvedSearchParams?.range),
    from: sanitizeQueryValue(resolvedSearchParams?.from),
    to: sanitizeQueryValue(resolvedSearchParams?.to),
    breakdown: sanitizeQueryValue(resolvedSearchParams?.breakdown)
  };
  const report = await getSalesReportDashboard(user, activeStoreId, filters);

  return <SalesReportClient report={report} />;
}
