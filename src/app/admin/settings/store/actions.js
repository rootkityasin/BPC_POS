"use server";

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/adapters/auth/password-service";
import { FEATURE_KEYS } from "@/core/policies/permission-policy";
import { hasManageAccess, requireFeatureView } from "@/modules/rbac/access";

const DEFAULT_MANAGER_PASSWORD = "password123";

function sanitizeText(value) {
  return String(value || "").trim();
}

function buildStoreCode(name) {
  const base = sanitizeText(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);

  return `${base || "STORE"}-${Date.now().toString(36).toUpperCase()}`;
}

function successState(message, extra = {}) {
  return { status: "success", message, ...extra };
}

function errorState(message) {
  return { status: "error", message };
}

async function uploadStoreLogo(file) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Store logo must be an image file");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "stores");
  await mkdir(uploadsDir, { recursive: true });

  const extension = String(file.name || "png").split(".").pop() || "png";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/stores/${fileName}`;
}

async function requireManageUser() {
  const user = await requireFeatureView(FEATURE_KEYS.STORE_SETTINGS);
  if (!hasManageAccess(user, FEATURE_KEYS.STORE_SETTINGS)) {
    throw new Error("Forbidden");
  }

  return user;
}

export async function saveStoreSetup(_, formData) {
  try {
    const user = await requireManageUser();
    const requestedStoreId = sanitizeText(formData.get("storeId"));
    const allowUserStoreFallback = sanitizeText(formData.get("allowUserStoreFallback")) === "true";
    const storeName = sanitizeText(formData.get("storeName"));
    const location = sanitizeText(formData.get("storeLocation"));
    const vatNumber = sanitizeText(formData.get("vatNumber"));
    const vatPercentageRaw = sanitizeText(formData.get("vatPercentage"));
    const existingManagerId = sanitizeText(formData.get("existingManagerId"));
    const managerName = sanitizeText(formData.get("managerName"));
    const managerEmail = sanitizeText(formData.get("managerEmail")).toLowerCase();
    const managerPassword = sanitizeText(formData.get("managerPassword")) || DEFAULT_MANAGER_PASSWORD;

    if (!storeName) {
      throw new Error("Store name is required");
    }

    const vatPercentage = Number(vatPercentageRaw || 0);
    if (!Number.isFinite(vatPercentage) || vatPercentage < 0) {
      throw new Error("VAT percentage must be a valid non-negative number");
    }

    if ((managerName && !managerEmail) || (!managerName && managerEmail)) {
      throw new Error("New manager requires both name and email");
    }

    const existingStore = requestedStoreId
      ? await prisma.store.findUnique({ where: { id: requestedStoreId } })
      : allowUserStoreFallback && user.storeId
        ? await prisma.store.findUnique({ where: { id: user.storeId } })
        : null;
    const logoFile = formData.get("storeLogo");
    const uploadedLogoUrl = logoFile instanceof File ? await uploadStoreLogo(logoFile) : null;

    const store = existingStore
      ? await prisma.store.update({
          where: { id: existingStore.id },
          data: {
            nameEn: storeName,
            location: location || null,
            vatNumber: vatNumber || null,
            vatPercentage,
            logoUrl: uploadedLogoUrl || existingStore.logoUrl
          }
        })
      : await prisma.store.create({
          data: {
            code: buildStoreCode(storeName),
            nameEn: storeName,
            nameBn: "",
            location: location || null,
            vatNumber: vatNumber || null,
            vatPercentage,
            logoUrl: uploadedLogoUrl
          }
        });

    if (!user.storeId) {
      await prisma.user.update({
        where: { id: user.sub },
        data: { storeId: store.id }
      });
    }

    if (existingManagerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: existingManagerId,
          role: { code: "MANAGER" }
        }
      });

      if (!manager) {
        throw new Error("Selected manager was not found");
      }

      await prisma.user.update({
        where: { id: manager.id },
        data: { storeId: store.id }
      });
    }

    if (managerName && managerEmail) {
      const managerRole = await prisma.role.findUnique({ where: { code: "MANAGER" } });
      if (!managerRole) {
        throw new Error("Manager role is missing");
      }

      const existingUser = await prisma.user.findUnique({ where: { email: managerEmail } });
      if (existingUser) {
        throw new Error("Manager email already exists");
      }

      const passwordHash = await hashPassword(managerPassword);
      await prisma.user.create({
        data: {
          name: managerName,
          email: managerEmail,
          passwordHash,
          roleId: managerRole.id,
          storeId: store.id
        }
      });
    }

    revalidatePath("/admin/settings/store");
    revalidatePath("/admin/settings/store/manage");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/user/roles");

    return successState(existingStore ? "Store updated successfully." : "Store created successfully.", { storeId: store.id });
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to save store setup");
  }
}

export async function unassignStoreManager(_, formData) {
  try {
    await requireManageUser();
    const managerId = sanitizeText(formData.get("managerId"));
    const storeId = sanitizeText(formData.get("storeId"));

    if (!managerId || !storeId) {
      throw new Error("Manager and store are required");
    }

    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        storeId,
        role: { code: "MANAGER" }
      }
    });

    if (!manager) {
      throw new Error("Manager is no longer assigned to this store");
    }

    await prisma.user.update({
      where: { id: managerId },
      data: { storeId: null }
    });

    revalidatePath("/admin/settings/store");
    revalidatePath("/admin/settings/store/manage");
    revalidatePath("/admin/user/roles");

    return successState("Manager unassigned successfully.");
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Failed to unassign manager");
  }
}
