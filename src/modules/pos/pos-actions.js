"use server";

import { prisma } from "@/lib/prisma";

export async function getPosCategories(storeId) {
  return prisma.category.findMany({
    where: { storeId },
    orderBy: { displayOrder: "asc" },
    include: {
      subCategories: { orderBy: { displayOrder: "asc" } }
    }
  });
}

export async function getPosDishes(storeId, categoryId = null, searchQuery = null) {
  const where = { storeId, isAvailable: true };
  
  if (categoryId) {
    where.categoryId = categoryId;
  }
  
  if (searchQuery) {
    where.OR = [
      { nameEn: { contains: searchQuery, mode: "insensitive" } },
      { nameBn: { contains: searchQuery, mode: "insensitive" } }
    ];
  }

  const [dishes, stockMap] = await Promise.all([
    prisma.dish.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
        stockItems: true
      },
      orderBy: { nameEn: "asc" }
    }),
    prisma.stockItem.findMany({
      where: { storeId },
      select: { dishId: true, quantity: true, lowStockLevel: true }
    })
  ]);

  const stockByDish = stockMap.reduce((acc, item) => {
    acc[item.dishId] = item;
    return acc;
  }, {});

  return dishes.map(dish => {
    const stock = stockByDish[dish.id] || { quantity: 0, lowStockLevel: 5 };
    return {
      ...dish,
      price: Number(dish.price),
      stock: stock.quantity,
      lowStockLevel: stock.lowStockLevel,
      isLowStock: stock.quantity <= stock.lowStockLevel
    };
  });
}

export async function createOrder(storeId, orderData) {
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      storeId,
      invoiceNumber,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      status: "PENDING",
      totalAmount: orderData.total,
      items: {
        create: orderData.items.map(item => ({
          dishId: item.dishId,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      }
    },
    include: { items: { include: { dish: true } } }
  });

  for (const item of orderData.items) {
    await prisma.stockItem.updateMany({
      where: { storeId, dishId: item.dishId },
      data: { quantity: { decrement: item.quantity } }
    });
  }

  return order;
}