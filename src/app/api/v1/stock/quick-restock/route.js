import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";
import { FEATURE_KEYS, canManage } from "@/core/policies/permission-policy";
import { verifyManagerOrAdminAuthorization } from "@/modules/auth/auth-service";

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const activeStoreId = await getActiveStoreId(user);
  const defaultTargetStoreId = activeStoreId || body.storeId || user.storeId || null;

  const items = Array.isArray(body.items) ? body.items : [body];
  if (items.length === 0) {
    return NextResponse.json({ error: "No items to restock" }, { status: 400 });
  }

  const hasDirectPermission = user.role === "SUPER_ADMIN" || canManage(user.permissions, FEATURE_KEYS.STOCK);

  if (!hasDirectPermission) {
    if (!body.managerAuth) {
      return NextResponse.json({ error: "Manager authorization required" }, { status: 403 });
    }
    const authStore = defaultTargetStoreId || items[0]?.storeId;
    const managerAuthResult = await verifyManagerOrAdminAuthorization(
      body.managerAuth.email,
      body.managerAuth.password,
      authStore
    );
    if (!managerAuthResult.authorized) {
      return NextResponse.json({ error: managerAuthResult.reason || "Invalid manager credentials" }, { status: 403 });
    }
  }

  const updatedRecords = [];

  for (const item of items) {
    const addQuantity = Math.max(0, parseInt(item.addQuantity || item.quantity || 0, 10));
    if (addQuantity <= 0) continue;

    if (item.productType === "dish" || item.dishId) {
      const rawDishId = item.productId || item.dishId || item.id;
      const cleanDishId = String(rawDishId).replace(/^dish-/, "");

      // Find existing stock linked to this dish
      let existingStock = await prisma.stockItem.findFirst({
        where: { dishId: cleanDishId }
      });

      if (existingStock) {
        const updated = await prisma.stockItem.update({
          where: { id: existingStock.id },
          data: { quantity: existingStock.quantity + addQuantity }
        });
        updatedRecords.push(updated);
      } else {
        const dish = await prisma.dish.findUnique({ where: { id: cleanDishId } });
        const targetStore = item.storeId || defaultTargetStoreId || dish?.storeId;
        if (!targetStore) continue;

        const created = await prisma.stockItem.create({
          data: {
            storeId: targetStore,
            dishId: cleanDishId,
            name: dish?.nameEn || "Dish Stock",
            nameBn: dish?.nameBn || null,
            price: dish?.price ? Number(dish.price) : null,
            quantity: addQuantity,
            supplier: "Kitchen Production",
            createdBy: user.name || "System"
          }
        });
        updatedRecords.push(created);
      }
    } else {
      const rawStockId = item.stockItemId || item.productId || item.id;
      const cleanStockId = String(rawStockId).replace(/^stock-/, "");

      let existingStock = await prisma.stockItem.findUnique({
        where: { id: cleanStockId }
      });

      if (!existingStock) {
        existingStock = await prisma.stockItem.findFirst({
          where: {
            OR: [
              { id: cleanStockId },
              { name: item.nameEn || item.name }
            ]
          }
        });
      }

      if (existingStock) {
        const updated = await prisma.stockItem.update({
          where: { id: existingStock.id },
          data: { quantity: existingStock.quantity + addQuantity }
        });
        updatedRecords.push(updated);
      }
    }
  }

  return NextResponse.json({ success: true, count: updatedRecords.length });
}
