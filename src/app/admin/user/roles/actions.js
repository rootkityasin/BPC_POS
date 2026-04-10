"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/adapters/auth/password-service";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { emitNotificationEvent } from "@/modules/notifications/notification-service";
import { requireFeatureView, hasManageAccess } from "@/modules/rbac/access";

const toggleMapping = {
  viewPos: FEATURE_KEYS.POS,
  managePos: FEATURE_KEYS.POS,
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
  manageDeviceSettings: FEATURE_KEYS.DEVICE_SETTINGS,
  viewStoreSettings: FEATURE_KEYS.STORE_SETTINGS,
  manageStoreSettings: FEATURE_KEYS.STORE_SETTINGS,
  viewUsers: FEATURE_KEYS.USERS,
  manageUsers: FEATURE_KEYS.USERS,
  viewCustomers: FEATURE_KEYS.CUSTOMERS,
  manageCustomers: FEATURE_KEYS.CUSTOMERS,
  viewReports: FEATURE_KEYS.REPORTS,
  manageReports: FEATURE_KEYS.REPORTS,
  viewExpenses: FEATURE_KEYS.EXPENSES,
  manageExpenses: FEATURE_KEYS.EXPENSES,
  viewNotifications: FEATURE_KEYS.NOTIFICATIONS,
  manageNotifications: FEATURE_KEYS.NOTIFICATIONS
};

function successState(message, extra = {}) {
  return { status: "success", message, ...extra };
}

function errorState(message) {
  return { status: "error", message };
}

async function requireUsersManageAccess() {
  const user = await requireFeatureView(FEATURE_KEYS.USERS);
  if (!hasManageAccess(user, FEATURE_KEYS.USERS)) {
    throw new Error("Forbidden");
  }

  return user;
}

async function getManagerOrThrow(userId) {
  const manager = await prisma.user.findFirst({
    where: { id: userId, role: { code: "MANAGER" } }
  });

  if (!manager) {
    throw new Error("Manager not found");
  }

  return manager;
}

export async function saveManagerOverrides(userId, _, formData) {
  try {
    const actor = await requireUsersManageAccess();
    const manager = await getManagerOrThrow(userId);

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

    await emitNotificationEvent("manager.permissions.updated", {
      managerName: manager.name,
      actorName: actor.email
    });

    return successState("Permissions saved successfully.");
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to save permissions");
  }
}

export async function toggleManagerActive(userId, _, formData) {
  try {
    const actor = await requireUsersManageAccess();
    const manager = await getManagerOrThrow(userId);
    const nextState = formData.get("nextState") === "active";

    await prisma.user.update({
      where: { id: manager.id },
      data: {
        isActive: nextState,
        failedLoginAttempts: nextState ? 0 : manager.failedLoginAttempts,
        lockedUntil: nextState ? null : manager.lockedUntil
      }
    });

    await emitNotificationEvent("manager.status.updated", {
      managerName: manager.name,
      isActive: nextState,
      actorName: actor.email
    });

    return successState(nextState ? "Manager activated successfully." : "Manager deactivated successfully.", {
      managerId: manager.id,
      isActive: nextState
    });
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to update manager status");
  }
}

export async function resetManagerPassword(userId, _, formData) {
  try {
    const actor = await requireUsersManageAccess();
    const manager = await getManagerOrThrow(userId);

    const password = String(formData.get("password") || "").trim() || "password123";
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true
      }
    });

    await emitNotificationEvent("manager.password.reset", {
      managerName: manager.name,
      actorName: actor.email
    });

    return successState("Manager password reset successfully.", {
      managerId: userId,
      isActive: true
    });
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to reset password");
  }
}
