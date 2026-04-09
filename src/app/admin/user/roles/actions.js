"use server";

import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { requireFeatureView, hasManageAccess } from "@/modules/rbac/access";

const toggleMapping = {
  viewOrders: FEATURE_KEYS.ORDERS,
  manageOrders: FEATURE_KEYS.ORDERS,
  viewStock: FEATURE_KEYS.STOCK,
  manageStock: FEATURE_KEYS.STOCK,
  viewCategory: FEATURE_KEYS.CATEGORY,
  manageCategory: FEATURE_KEYS.CATEGORY,
  viewSubCategory: FEATURE_KEYS.SUBCATEGORY,
  manageSubCategory: FEATURE_KEYS.SUBCATEGORY,
  viewDishes: FEATURE_KEYS.DISHES,
  manageDishes: FEATURE_KEYS.DISHES,
  viewDeviceSettings: FEATURE_KEYS.DEVICE_SETTINGS,
  manageDeviceSettings: FEATURE_KEYS.DEVICE_SETTINGS
};

export async function saveManagerOverrides(userId, formData) {
  const user = await requireFeatureView(FEATURE_KEYS.USERS);
  if (!hasManageAccess(user, FEATURE_KEYS.USERS)) {
    throw new Error("Forbidden");
  }

  const updates = Object.entries(toggleMapping).reduce((acc, [field, key]) => {
    if (!acc[key]) acc[key] = { key, canView: false, canManage: false };
    const checked = formData.get(field) === "on";
    if (field.startsWith("view")) acc[key].canView = checked;
    if (field.startsWith("manage")) acc[key].canManage = checked;
    return acc;
  }, {});

  await Promise.all(
    Object.values(updates).map((entry) =>
      prisma.userPermissionOverride.upsert({
        where: { userId_key: { userId, key: entry.key } },
        update: { canView: entry.canView, canManage: entry.canManage },
        create: { userId, key: entry.key, canView: entry.canView, canManage: entry.canManage }
      })
    )
  );
}
