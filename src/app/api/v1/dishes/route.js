import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { translateTexts } from "@/modules/i18n/libretranslate-service";

function buildSku() {
  return `DISH-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const nameEn = String(body.nameEn || "").trim();
  const categoryId = String(body.categoryId || "").trim();
  const subCategoryId = String(body.subCategoryId || "").trim();
  const ingredientStockItemIds = Array.isArray(body.ingredientStockItemIds) ? body.ingredientStockItemIds : [];
  const parsedPrice = Number(body.price || 0);

  if (!nameEn || !categoryId || ingredientStockItemIds.length === 0) {
    return NextResponse.json(
      { error: "Dish name, category, and at least one inventory item are required" },
      { status: 400 }
    );
  }

  const dish = await prisma.dish.create({
    data: {
      storeId: user.storeId,
      nameEn,
      nameBn: "",
      categoryId,
      subCategoryId: subCategoryId || null,
      sku: buildSku(),
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
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
