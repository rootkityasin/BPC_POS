import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { translateTexts } from "@/modules/i18n/libretranslate-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function buildSku() {
  return `DISH-${Date.now().toString(36).toUpperCase()}`;
}

function revalidateDishPages() {
  revalidatePath("/admin/dishes");
  revalidatePath("/admin/pos");
}

export async function POST(request) {
  const user = await getSessionUser();
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let nameEn = "";
  let nameBn = "";
  let categoryId = "";
  let subCategoryId = "";
  let ingredientStockItemIds = [];
  let parsedPrice = 0;
  let showOnList = false;
  let createdBy = user.name || user.email || "Admin";
  let imageUrl = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    nameEn = String(formData.get("nameEn") || "").trim();
    nameBn = String(formData.get("nameBn") || "").trim();
    categoryId = String(formData.get("categoryId") || "").trim();
    subCategoryId = String(formData.get("subCategoryId") || "").trim();
    const ingredientIdsRaw = formData.get("ingredientStockItemIds");
    ingredientStockItemIds = ingredientIdsRaw ? JSON.parse(ingredientIdsRaw) : [];
    parsedPrice = Number(formData.get("price") || 0);
    showOnList = formData.get("showOnList") === "true";
    createdBy = String(formData.get("createdBy") || createdBy).trim();

    const imageFile = formData.get("image");
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = path.join(process.cwd(), "public", "uploads", "dishes");
      await mkdir(uploadsDir, { recursive: true });

      const ext = imageFile.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      await writeFile(filePath, buffer);
      imageUrl = `/uploads/dishes/${fileName}`;
    }
  } else {
    const body = await request.json();
    nameEn = String(body.nameEn || "").trim();
    nameBn = String(body.nameBn || "").trim();
    categoryId = String(body.categoryId || "").trim();
    subCategoryId = String(body.subCategoryId || "").trim();
    ingredientStockItemIds = Array.isArray(body.ingredientStockItemIds) ? body.ingredientStockItemIds : [];
    parsedPrice = Number(body.price || 0);
    showOnList = body.showOnList === true;
    createdBy = String(body.createdBy || createdBy).trim();
    imageUrl = body.imageUrl || null;
  }

  if (!nameEn || !categoryId || ingredientStockItemIds.length === 0) {
    return NextResponse.json(
      { error: "Dish name, category, and at least one inventory item are required" },
      { status: 400 }
    );
  }

  const dish = await prisma.dish.create({
    data: {
      storeId,
      nameEn,
      nameBn: nameBn || "",
      categoryId,
      subCategoryId: subCategoryId || null,
      sku: buildSku(),
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      showOnList,
      createdBy,
      imageUrl,
      ingredients: {
        create: ingredientStockItemIds.map((stockItemId) => ({ stockItemId }))
      }
    },
    include: {
      category: true,
      subCategory: true,
      ingredients: {
        include: { stockItem: true }
      }
    }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });
  revalidateDishPages();

  return NextResponse.json(dish);
}

export async function PATCH(request) {
  const user = await getSessionUser();
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let id = "";
  let nameEn;
  let nameBn;
  let categoryId;
  let subCategoryId;
  let ingredientStockItemIds;
  let price;
  let showOnList;
  let createdBy;
  let imageUrl;
  let clearImage = false;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    id = String(formData.get("id") || "").trim();
    if (formData.has("nameEn")) nameEn = String(formData.get("nameEn") || "").trim();
    if (formData.has("nameBn")) nameBn = String(formData.get("nameBn") || "").trim();
    if (formData.has("categoryId")) categoryId = String(formData.get("categoryId") || "").trim();
    if (formData.has("subCategoryId")) subCategoryId = String(formData.get("subCategoryId") || "").trim();
    if (formData.has("price")) price = Number(formData.get("price"));
    if (formData.has("showOnList")) showOnList = formData.get("showOnList") === "true";
    if (formData.has("createdBy")) createdBy = String(formData.get("createdBy") || "").trim();
    if (formData.has("clearImage")) clearImage = formData.get("clearImage") === "true";

    const ingredientIdsRaw = formData.get("ingredientStockItemIds");
    if (ingredientIdsRaw !== null) {
      try {
        ingredientStockItemIds = JSON.parse(ingredientIdsRaw);
      } catch {
        ingredientStockItemIds = [];
      }
    }

    const imageFile = formData.get("image");
    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = path.join(process.cwd(), "public", "uploads", "dishes");
      await mkdir(uploadsDir, { recursive: true });

      const ext = imageFile.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      await writeFile(filePath, buffer);
      imageUrl = `/uploads/dishes/${fileName}`;
    }
  } else {
    const body = await request.json();
    id = String(body.id || "").trim();
    nameEn = body.nameEn;
    nameBn = body.nameBn;
    categoryId = body.categoryId;
    subCategoryId = body.subCategoryId;
    ingredientStockItemIds = body.ingredientStockItemIds;
    price = body.price;
    showOnList = body.showOnList;
    createdBy = body.createdBy;
    imageUrl = body.imageUrl;
    clearImage = body.clearImage === true;
  }

  if (!id) {
    return NextResponse.json({ error: "Dish ID is required" }, { status: 400 });
  }

  const existingDish = await prisma.dish.findFirst({
    where: { id, storeId }
  });

  if (!existingDish) {
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });
  }

  const updateData = {};
  if (nameEn !== undefined) updateData.nameEn = String(nameEn).trim();
  if (nameBn !== undefined) updateData.nameBn = String(nameBn).trim();
  if (categoryId !== undefined) updateData.categoryId = String(categoryId).trim();
  if (subCategoryId !== undefined) updateData.subCategoryId = subCategoryId ? String(subCategoryId).trim() : null;
  if (showOnList !== undefined) updateData.showOnList = Boolean(showOnList);
  if (price !== undefined) {
    updateData.price = Number(price);
  }
  if (imageUrl !== undefined && imageUrl !== null) {
    updateData.imageUrl = imageUrl;
  } else if (clearImage) {
    updateData.imageUrl = null;
  }
  if (createdBy) {
    updateData.createdBy = String(createdBy).trim();
  }

  if (ingredientStockItemIds !== undefined) {
    await prisma.dishIngredient.deleteMany({ where: { dishId: id } });
    await prisma.dishIngredient.createMany({
      data: ingredientStockItemIds.map((stockItemId) => ({ dishId: id, stockItemId }))
    });
  }

  const dish = await prisma.dish.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      subCategory: true,
      ingredients: {
        include: { stockItem: true }
      }
    }
  });

  if (updateData.nameEn) {
    await translateTexts({ texts: [updateData.nameEn], sourceLanguage: "en", targetLanguage: "bn" });
  }
  revalidateDishPages();

  return NextResponse.json(dish);
}

export async function DELETE(request) {
  const user = await getSessionUser();
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Dish ID is required" }, { status: 400 });
  }

  const existingDish = await prisma.dish.findFirst({
    where: { id, storeId }
  });

  if (!existingDish) {
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });
  }

  await prisma.dish.delete({ where: { id } });

  revalidateDishPages();

  return NextResponse.json({ success: true });
}
