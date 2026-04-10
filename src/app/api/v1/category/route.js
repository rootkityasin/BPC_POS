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
  const storeId = await getActiveStoreId(user);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { nameEn, color } = body;

  if (!nameEn) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      storeId,
      nameEn,
      nameBn: "",
      color: color || "#ff242d"
    }
  });

  await translateTexts({ texts: [nameEn], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(category);
}
