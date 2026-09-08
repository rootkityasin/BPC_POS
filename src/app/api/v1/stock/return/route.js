import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
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

  const storeId = await resolveTargetStoreId(user);
  const where = user.role === "SUPER_ADMIN" && !storeId ? {} : { storeId };

  const returns = await prisma.stockReturn.findMany({
    where,
    include: {
      stockItem: true,
      store: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json(returns);
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
    return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
  }

  const stockItemId = String(body.stockItemId || "").trim();
  const quantity = Math.floor(Number(body.quantity));
  const reason = String(body.reason || "ROTTEN").trim();
  const disposition = String(body.disposition || "RETURN_TO_SUPPLIER").trim();
  const supplier = String(body.supplier || "").trim();
  const refundAmount =
    body.refundAmount === "" || body.refundAmount === null || body.refundAmount === undefined
      ? null
      : Number(body.refundAmount);
  const notes = String(body.notes || "").trim() || null;

  if (!stockItemId) {
    return NextResponse.json({ error: "Stock item ID is required" }, { status: 400 });
  }
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Return quantity must be greater than zero" }, { status: 400 });
  }

  const existingItem = await prisma.stockItem.findFirst({
    where: { id: stockItemId, storeId }
  });

  if (!existingItem) {
    return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  }

  if (existingItem.quantity < quantity) {
    return NextResponse.json(
      { error: `Return quantity (${quantity}) exceeds current available stock (${existingItem.quantity})` },
      { status: 400 }
    );
  }

  const buyingPrice = Number(existingItem.buyingPrice ?? 0);
  const lossAmount = buyingPrice > 0 ? Number((buyingPrice * quantity).toFixed(2)) : null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedStockItem = await tx.stockItem.update({
      where: { id: stockItemId },
      data: {
        quantity: { decrement: quantity }
      }
    });

    const stockReturn = await tx.stockReturn.create({
      data: {
        storeId,
        stockItemId,
        quantity,
        reason,
        disposition,
        supplier: supplier || existingItem.supplier || "Local Vendor",
        refundAmount: refundAmount !== null && !isNaN(refundAmount) ? refundAmount : null,
        lossAmount,
        notes,
        returnedBy: user.name || "System User"
      },
      include: {
        stockItem: true
      }
    });

    return { updatedStockItem, stockReturn };
  });

  return NextResponse.json(result);
}
