import { Card } from "@/components/ui/card";
import { I18nText } from "@/components/i18n/i18n-text";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView } from "@/modules/rbac/access";

export default async function StoreSettingsPage() {
  await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-slate-900"><I18nText k="pages.storeSettingsTitle" fallback="Store Settings" /></h2>
      <p className="mt-2 text-sm text-slate-500"><I18nText k="pages.storeSettingsSubtitle" fallback="Super-admin-only store configuration will expand here." /></p>
    </Card>
  );
}
