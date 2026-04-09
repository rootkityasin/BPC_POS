import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subCategories = await prisma.subCategory.findMany({
    where: { storeId: user.storeId || undefined },
    include: {
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

  const body = await request.json();
  const { nameEn, nameBn, categoryId } = body;

  if (!nameEn || !categoryId) {
    return NextResponse.json({ error: "Sub-category name and category are required" }, { status: 400 });
  }

  const subCategory = await prisma.subCategory.create({
    data: {
      storeId: user.storeId,
      categoryId,
      nameEn,
      nameBn: nameBn || ""
    }
  });

  return NextResponse.json(subCategory);
}