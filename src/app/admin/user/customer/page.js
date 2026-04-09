import { Card } from "@/components/ui/card";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";

export default async function CustomerPage() {
  await requireFeatureView(FEATURE_KEYS.CUSTOMERS);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-slate-900">Customer</h2>
      <p className="mt-2 text-sm text-slate-500">Customer management and import tools will land here.</p>
    </Card>
  );
}
