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

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canView(user.permissions, FEATURE_KEYS.STOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storeId = await getActiveStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };
  const stockItems = await prisma.stockItem.findMany({
    where,
    include: { dish: true, store: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(stockItems);
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.STOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const storeId = await resolveTargetStoreId(user, body.storeId);
  if (!storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Stock item name is required" }, { status: 400 });
  }

  const stockItem = await prisma.stockItem.create({
    data: {
      storeId,
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

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.STOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Stock item ID is required" }, { status: 400 });
  }

  const existingItem = await prisma.stockItem.findFirst({ where: { id, storeId } });
  if (!existingItem) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  const name = String(body.name || existingItem.name || "").trim();
  const updatedItem = await prisma.stockItem.update({
    where: { id },
    data: {
      name,
      quantity: Number(body.quantity ?? existingItem.quantity ?? 0),
      supplier: String(body.supplier ?? existingItem.supplier ?? "Local Vendor").trim() || "Local Vendor",
      createdBy: String(body.createdBy ?? existingItem.createdBy ?? user.name ?? "System User").trim() || user.name || "System User",
      price: body.price === null || body.price === undefined || body.price === "" ? null : Number(body.price)
    }
  });

  return NextResponse.json(updatedItem);
}

export async function DELETE(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.STOCK)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const storeId = await resolveTargetStoreId(user, body.storeId);

  if (!id || !storeId) {
    return NextResponse.json({ error: "Stock item ID is required" }, { status: 400 });
  }

  const existingItem = await prisma.stockItem.findFirst({ where: { id, storeId } });
  if (!existingItem) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  await prisma.stockItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
