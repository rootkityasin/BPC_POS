import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";

export default async function SalesReportPage() {
  await requireFeatureView(FEATURE_KEYS.REPORTS);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-slate-900">Sales Report</h2>
      <p className="mt-2 text-sm text-slate-500">CSV-first sales reporting scaffold for super admins.</p>
    </Card>
  );
}
