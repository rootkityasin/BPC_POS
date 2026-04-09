import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";

export default async function ExpenseTrackingPage() {
  await requireFeatureView(FEATURE_KEYS.EXPENSES);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-slate-900">Expense Tracking</h2>
      <p className="mt-2 text-sm text-slate-500">Expense tracking foundation for super-admin operational reporting.</p>
    </Card>
  );
}
