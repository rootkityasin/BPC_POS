import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { FEATURE_KEYS, canManage, canView } from "@/core/policies/permission-policy";
import { getSessionUser } from "@/modules/auth/session-service";
import { getActiveStoreId } from "@/modules/auth/active-store";

const VALID_ORDER_STATUSES = new Set(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]);
const VALID_PRINT_STATUSES = new Set(["Not Printed", "Printed"]);

function buildOrderScope(user, storeId) {
  // Store managers are ALWAYS locked to their own store
  if (user.role !== "SUPER_ADMIN") {
    return { storeId: user.storeId || storeId };
  }

  // SUPER_ADMIN with a selected store
  if (storeId) {
    return { storeId };
  }

  // SUPER_ADMIN with no store selected - sees all stores
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

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN" && !canView(user.permissions, FEATURE_KEYS.ORDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activeStoreId = await getActiveStoreId(user);
    const { searchParams } = new URL(request.url);
    const queryStoreId = searchParams.get("storeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const scopedStoreId = activeStoreId || queryStoreId;
    const where = {
      ...buildOrderScope(user, scopedStoreId),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: includeOrderRelations(),
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return NextResponse.json({ orders, total, page, limit });
  } catch (error) {
    console.error("[ORDERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN" && !canManage(user.permissions, FEATURE_KEYS.ORDERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, status, customerName, customerPhone, itemPrintStatuses } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const patchStoreId = await getActiveStoreId(user);
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...buildOrderScope(user, patchStoreId)
      },
      include: includeOrderRelations()
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData = {};

    if (status !== undefined) {
      const normalizedStatus = String(status).trim();
      if (!VALID_ORDER_STATUSES.has(normalizedStatus)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      }
      updateData.status = normalizedStatus;
    }
    if (customerName !== undefined) {
      updateData.customerName = String(customerName || "").trim() || null;
    }
    if (customerPhone !== undefined) {
      updateData.customerPhone = String(customerPhone || "").trim() || null;
    }

    if (itemPrintStatuses && Array.isArray(itemPrintStatuses)) {
      const validItemIds = new Set(existingOrder.items.map((item) => item.id));

      for (const { itemId, printStatus } of itemPrintStatuses) {
        if (!validItemIds.has(itemId)) {
          return NextResponse.json({ error: "Invalid order item" }, { status: 400 });
        }

        const normalizedPrintStatus = String(printStatus || "Not Printed");
        if (!VALID_PRINT_STATUSES.has(normalizedPrintStatus)) {
          return NextResponse.json({ error: "Invalid print status" }, { status: 400 });
        }

        await prisma.orderItem.update({
          where: { id: itemId },
          data: { printStatus: normalizedPrintStatus },
        });
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: includeOrderRelations(),
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("[ORDERS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
