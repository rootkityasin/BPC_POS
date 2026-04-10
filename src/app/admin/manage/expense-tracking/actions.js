"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { requireFeatureView, hasManageAccess } from "@/modules/rbac/access";

function successState(message) {
  return { status: "success", message };
}

function errorState(message) {
  return { status: "error", message };
}

function sanitizeText(value) {
  return String(value || "").trim();
}

export async function addExpense(_, formData) {
  try {
    const user = await requireFeatureView(FEATURE_KEYS.EXPENSES);
    if (!hasManageAccess(user, FEATURE_KEYS.EXPENSES)) {
      throw new Error("Forbidden");
    }

    const activeStoreId = await getActiveStoreId(user);
    const requestedStoreId = sanitizeText(formData.get("storeId"));
    const storeId = user.role === "SUPER_ADMIN"
      ? requestedStoreId || activeStoreId
      : user.storeId;

    if (!storeId) {
      throw new Error("Select a store before adding an expense");
    }

    const title = sanitizeText(formData.get("title"));
    const type = sanitizeText(formData.get("type"));
    const note = sanitizeText(formData.get("note"));
    const incurredOnRaw = sanitizeText(formData.get("incurredOn"));
    const amount = Number(formData.get("amount") || 0);

    if (!title) throw new Error("Expense title is required");
    if (!type) throw new Error("Expense type is required");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Expense amount must be greater than zero");

    const incurredOn = incurredOnRaw ? new Date(`${incurredOnRaw}T12:00:00.000Z`) : new Date();
    if (Number.isNaN(incurredOn.getTime())) throw new Error("Expense date is invalid");

    await prisma.expense.create({
      data: {
        storeId,
        type,
        title,
        amount,
        note: note || null,
        incurredOn,
        createdBy: user.email
      }
    });

    revalidatePath("/admin/manage/expense-tracking");
    return successState("Expense added successfully.");
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to add expense");
  }
}
