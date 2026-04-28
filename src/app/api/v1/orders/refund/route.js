import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { FEATURE_KEYS, canManage } from "@/core/policies/permission-policy";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";

function buildOrderScope(user, storeId) {
  if (user.role !== "SUPER_ADMIN") {
    return { storeId: user.storeId || storeId };
  }
  if (storeId) {
    return { storeId };
  }
  return {};
}

function includeOrderRelations() {
  return {
    store: {
      include: {
        terminals: true
      }
    },
    items: {
      include: {
        dish: true,
        stockItem: true
      }
    }
  };
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.ORDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const orderId = body?.orderId;
    const refundItems = Array.isArray(body?.refundItems)
      ? body.refundItems
      : Array.isArray(body?.items)
        ? body.items
        : [];

    if (!orderId || !Array.isArray(refundItems) || refundItems.length === 0) {
      return NextResponse.json({ error: "Order ID and refund items are required" }, { status: 400 });
    }

    const activeStoreId = await getActiveStoreId(user);
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...buildOrderScope(user, activeStoreId)
      },
      include: includeOrderRelations()
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot refund a cancelled order" }, { status: 400 });
    }

    const itemMap = new Map(existingOrder.items.map((item) => [item.id, item]));

    // Validate all refund items
    for (const { itemId, quantity } of refundItems) {
      const item = itemMap.get(itemId);
      if (!item) {
        return NextResponse.json({ error: "Invalid order item" }, { status: 400 });
      }

      const maxRefundable = item.quantity;

      if (quantity <= 0 || quantity > maxRefundable) {
        return NextResponse.json(
          { error: `Invalid refund quantity for "${item.itemName}". Max refundable: ${maxRefundable}` },
          { status: 400 }
        );
      }

      if (item.dishId && quantity !== maxRefundable) {
        return NextResponse.json(
          { error: `Dish items must be refunded fully for "${item.itemName}".` },
          { status: 400 }
        );
      }
    }

    // Process refunds: update item quantities and restore stock
    let totalRefundAmount = 0;

    for (const { itemId, quantity } of refundItems) {
      const item = itemMap.get(itemId);
      totalRefundAmount += quantity * item.unitPrice;

      const nextQuantity = Math.max(0, Number(item.quantity || 0) - quantity);

      if (nextQuantity === 0) {
        await prisma.orderItem.delete({
          where: { id: itemId }
        });
      } else {
        await prisma.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: nextQuantity
          }
        });
      }

      // Restore stock for dish items only when stock is already tracked (>0)
      if (item.dishId) {
        await prisma.stockItem.updateMany({
          where: {
            storeId: existingOrder.storeId,
            dishId: item.dishId,
            quantity: { not: 0 }
          },
          data: { quantity: { increment: quantity } }
        });
      }

      // Restore stock for direct stock items only when stock is already tracked (>0)
      if (item.stockItemId) {
        await prisma.stockItem.updateMany({
          where: { id: item.stockItemId, quantity: { not: 0 } },
          data: { quantity: { increment: quantity } }
        });
      }
    }

    // Check if ALL items are fully refunded -> mark order as REFUNDED
    const updatedItems = await prisma.orderItem.findMany({
      where: { orderId }
    });

    const allFullyRefunded = updatedItems.length === 0 || updatedItems.every(
      (item) => Number(item.quantity || 0) <= 0
    );

    const orderUpdateData = {};
    if (allFullyRefunded) {
      orderUpdateData.status = "REFUNDED";
    }

    // Update order total (subtract refund amount)
    const newTotal = Math.max(0, existingOrder.totalAmount - totalRefundAmount);
    orderUpdateData.totalAmount = newTotal;

    if (Object.keys(orderUpdateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: orderUpdateData
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: includeOrderRelations()
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("[ORDERS_REFUND]", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
