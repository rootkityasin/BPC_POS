"use server";

import { revalidatePath } from "next/cache";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { emitNotificationEvent } from "@/modules/notifications/notification-service";
import { requireFeatureView, hasManageAccess } from "@/modules/rbac/access";
import { updateDeviceSettings } from "@/modules/settings/settings-service";

const INITIAL_ACTION_STATE = { status: "idle", message: "" };

export async function saveDeviceSettings(_, formData) {
  try {
    const user = await requireFeatureView(FEATURE_KEYS.DEVICE_SETTINGS);
    if (!hasManageAccess(user, FEATURE_KEYS.DEVICE_SETTINGS)) {
      throw new Error("Forbidden");
    }

    const printers = JSON.parse(String(formData.get("printers") || "[]"));

    const store = await updateDeviceSettings(user.storeId, {
      timezone: formData.get("timezone"),
      defaultPrinterKey: formData.get("defaultPrinterKey"),
      printers,
      receiptTheme: formData.get("receiptTheme"),
      receiptFontSize: formData.get("receiptFontSize"),
      receiptAccentColor: formData.get("receiptAccentColor"),
      receiptPaperWidth: formData.get("receiptPaperWidth"),
      receiptHeaderText: formData.get("receiptHeaderText"),
      receiptFooterText: formData.get("receiptFooterText"),
      receiptShowLogo: formData.get("receiptShowLogo") === "on",
      receiptShowSeller: formData.get("receiptShowSeller") === "on",
      receiptShowBuyer: formData.get("receiptShowBuyer") === "on",
      receiptShowOrderStatus: formData.get("receiptShowOrderStatus") === "on",
      receiptShowItemNotes: formData.get("receiptShowItemNotes") === "on",
      receiptShowQr: formData.get("receiptShowQr") === "on",
      receiptShowSign: formData.get("receiptShowSign") === "on",
      receiptWatermark: formData.get("receiptWatermark")
    });

    await emitNotificationEvent("device.settings.updated", {
      storeId: store.id,
      storeName: store.nameEn,
      actorName: user.email
    });

    revalidatePath("/admin/settings/device");
    revalidatePath("/admin/orders");
    return { status: "success", message: "Device settings saved successfully." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Failed to save device settings" };
  }
}
