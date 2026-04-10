import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { translateTexts } from "@/modules/i18n/libretranslate-service";

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
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
