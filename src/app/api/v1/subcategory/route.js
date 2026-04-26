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
  if (user.role !== "SUPER_ADMIN" && !canView(user.permissions, FEATURE_KEYS.SUBCATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const subCategories = await prisma.subCategory.findMany({
    where,
    include: {
      store: true,
      category: true,
      _count: { select: { dishes: true } }
    },
    orderBy: { displayOrder: "asc" }
  });

  return NextResponse.json(subCategories);
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.SUBCATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const storeId = await resolveTargetStoreId(user, body.storeId);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nameEn, categoryId } = body;

  if (!nameEn || !categoryId) {
    return NextResponse.json({ error: "Sub-category name and category are required" }, { status: 400 });
  }

  const subCategory = await prisma.subCategory.create({
    data: {
      storeId,
      categoryId,
      nameEn,
      nameBn: ""
    }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(subCategory);
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.SUBCATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Sub-category ID is required" }, { status: 400 });
  }

  const existingSubCategory = await prisma.subCategory.findFirst({ where: { id, storeId } });
  if (!existingSubCategory) {
    return NextResponse.json({ error: "Sub-category not found" }, { status: 404 });
  }

  const nameEn = String(body.nameEn || existingSubCategory.nameEn || "").trim();
  const categoryId = String(body.categoryId || existingSubCategory.categoryId || "").trim();

  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const subCategory = await prisma.subCategory.update({
    where: { id },
    data: { nameEn, categoryId }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(subCategory);
}

export async function DELETE(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.SUBCATEGORY)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Sub-category ID is required" }, { status: 400 });
  }

  const existingSubCategory = await prisma.subCategory.findFirst({ where: { id, storeId } });
  if (!existingSubCategory) {
    return NextResponse.json({ error: "Sub-category not found" }, { status: 404 });
  }

  try {
    await prisma.subCategory.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Delete the dishes in this sub-category first." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
