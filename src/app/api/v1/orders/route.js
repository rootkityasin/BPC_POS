import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const where = storeId ? { storeId } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { dish: true, stockItem: true } } },
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
    const body = await request.json();
    const { orderId, status, itemPrintStatuses } = body;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }
    const updateData = {};
    if (status) updateData.status = status;
    if (itemPrintStatuses && Array.isArray(itemPrintStatuses)) {
      for (const { itemId, printStatus } of itemPrintStatuses) {
        await prisma.orderItem.update({
          where: { id: itemId },
          data: { printStatus },
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
      include: { items: { include: { dish: true, stockItem: true } } },
    });
    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("[ORDERS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}