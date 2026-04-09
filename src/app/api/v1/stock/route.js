import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { translateTexts } from "@/modules/i18n/libretranslate-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stockItems = await prisma.stockItem.findMany({
    where: { storeId: user.storeId || undefined },
    include: { dish: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(stockItems);
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Stock item name is required" }, { status: 400 });
  }

  const stockItem = await prisma.stockItem.create({
    data: {
      storeId: user.storeId,
      name,
      quantity: Number(body.quantity || 0),
      price: body.price === null || body.price === undefined || body.price === "" ? null : Number(body.price),
      supplier: String(body.supplier || "Local Vendor").trim() || "Local Vendor",
      createdBy: String(body.createdBy || user.name || "System User").trim() || user.name || "System User"
    }
  });

  await translateTexts({ texts: [name, stockItem.supplier], sourceLanguage: "en", targetLanguage: "bn" });

  return NextResponse.json(stockItem);
}
