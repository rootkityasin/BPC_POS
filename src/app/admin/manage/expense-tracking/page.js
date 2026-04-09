import { Card } from "@/components/ui/card";
import { I18nText } from "@/components/i18n/i18n-text";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";

export default async function ExpenseTrackingPage() {
  await requireFeatureView(FEATURE_KEYS.EXPENSES);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-slate-900"><I18nText k="pages.expenseTrackingTitle" fallback="Expense Tracking" /></h2>
      <p className="mt-2 text-sm text-slate-500"><I18nText k="pages.expenseTrackingSubtitle" fallback="Expense tracking foundation for super-admin operational reporting." /></p>
    </Card>
  );
}
