import { redirect } from "next/navigation";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";
import { getDeviceSettings } from "@/modules/settings/settings-service";
import { DeviceSettingsClient } from "./device-settings-client";

export default async function DeviceSettingsPage() {
  const user = await requireFeatureView(FEATURE_KEYS.DEVICE_SETTINGS);
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    redirect("/admin/settings/store");
  }

  const settings = await getDeviceSettings(storeId);
  const canEdit = hasManageAccess(user, FEATURE_KEYS.DEVICE_SETTINGS);

  return <DeviceSettingsClient settings={settings} canEdit={canEdit} storeName={settings?.storeName || "BPC POS"} />;
}
