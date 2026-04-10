import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { translateTexts } from "@/modules/i18n/libretranslate-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function buildSku() {
  return `DISH-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request) {
  const user = await getSessionUser();
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let nameEn = "";
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
      nameBn: "",
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

  return NextResponse.json(dish);
}

export async function PATCH(request) {
  const user = await getSessionUser();
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, showOnList, nameEn, categoryId, subCategoryId, ingredientStockItemIds, price, imageUrl, createdBy } = body;

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

  if (typeof showOnList === "boolean") {
    updateData.showOnList = showOnList;
  }
  if (nameEn !== undefined) {
    updateData.nameEn = String(nameEn).trim();
  }
  if (categoryId !== undefined) {
    updateData.categoryId = String(categoryId).trim();
  }
  if (subCategoryId !== undefined) {
    updateData.subCategoryId = String(subCategoryId).trim() || null;
  }
  if (price !== undefined) {
    updateData.price = Number(price);
  }
  if (imageUrl !== undefined) {
    updateData.imageUrl = imageUrl;
  }
  if (createdBy !== undefined) {
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

  return NextResponse.json(dish);
}