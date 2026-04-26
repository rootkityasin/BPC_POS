import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { translateTexts } from "@/modules/i18n/libretranslate-service";
import { FEATURE_KEYS, canManage, canView } from "@/core/policies/permission-policy";

async function resolveTargetStoreId(user, providedStoreId = "") {
  const activeStoreId = await getActiveStoreId(user);
  if (activeStoreId) return activeStoreId;
  return user.role === "SUPER_ADMIN" ? String(providedStoreId || "").trim() : "";
}

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canView(user.permissions, FEATURE_KEYS.CATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const categories = await prisma.category.findMany({
    where,
    include: {
      store: true,
      _count: { select: { dishes: true } }
    },
    orderBy: { displayOrder: "asc" }
  });

  return NextResponse.json(categories);
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.CATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const storeId = await resolveTargetStoreId(user, body.storeId);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nameEn, color } = body;

  if (!nameEn) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      storeId,
      nameEn,
      nameBn: "",
      color: color || "#2771cb"
    }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(category);
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.CATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  const existingCategory = await prisma.category.findFirst({ where: { id, storeId } });
  if (!existingCategory) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const nameEn = String(body.nameEn || existingCategory.nameEn || "").trim();
  const color = String(body.color || existingCategory.color || "#2771cb").trim() || "#2771cb";

  const category = await prisma.category.update({
    where: { id },
    data: { nameEn, color }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(category);
}

export async function DELETE(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.CATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  const existingCategory = await prisma.category.findFirst({ where: { id, storeId } });
  if (!existingCategory) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Delete the subcategories or dishes in this category first." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
