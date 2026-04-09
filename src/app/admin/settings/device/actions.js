"use server";

import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView, hasManageAccess } from "@/modules/rbac/access";
import { updateDeviceSettings } from "@/modules/settings/settings-service";

export async function saveDeviceSettings(formData) {
  const user = await requireFeatureView(FEATURE_KEYS.DEVICE_SETTINGS);
  if (!hasManageAccess(user, FEATURE_KEYS.DEVICE_SETTINGS)) {
    throw new Error("Forbidden");
  }

  await updateDeviceSettings(user.storeId, {
    timezone: formData.get("timezone"),
    receiptTheme: formData.get("receiptTheme"),
    receiptFontSize: formData.get("receiptFontSize"),
    receiptShowLogo: formData.get("receiptShowLogo") === "on",
    receiptShowSeller: formData.get("receiptShowSeller") === "on",
    receiptShowBuyer: formData.get("receiptShowBuyer") === "on",
    receiptShowQr: formData.get("receiptShowQr") === "on",
    receiptShowSign: formData.get("receiptShowSign") === "on",
    receiptWatermark: formData.get("receiptWatermark")
  });
}
