import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { storeId: user.storeId || undefined },
    include: {
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

  const body = await request.json();
  const { nameEn, nameBn, color } = body;

  if (!nameEn) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      storeId: user.storeId,
      nameEn,
      nameBn: nameBn || "",
      color: color || "#ff242d"
    }
  });

  return NextResponse.json(category);
}