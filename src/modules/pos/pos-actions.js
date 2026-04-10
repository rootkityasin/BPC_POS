"use server";

import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { emitNotificationEvent } from "@/modules/notifications/notification-service";
import { calculateVatInclusiveTotals } from "@/modules/pos/vat";

export async function getPosCategories(storeId) {
  return prisma.category.findMany({
    where: storeId ? { storeId } : {},
    orderBy: { displayOrder: "asc" },
    include: {
      store: {
        select: { id: true, nameEn: true }
      },
      subCategories: { orderBy: { displayOrder: "asc" } }
    }
  });
}

export async function getPosProducts(storeId, categoryId = null, searchQuery = null) {
  const dishWhere = { ...(storeId ? { storeId } : {}), isAvailable: true, showOnList: true };

  if (categoryId && categoryId !== "__inventory__") {
    dishWhere.categoryId = categoryId;
  }

  if (searchQuery) {
    dishWhere.OR = [
      { nameEn: { contains: searchQuery, mode: "insensitive" } }
    ];
  }

  const inventoryWhere = {
    ...(storeId ? { storeId } : {}),
    dishId: null,
    price: { not: null }
  };

  if (searchQuery) {
    inventoryWhere.name = { contains: searchQuery, mode: "insensitive" };
  }

  const [dishes, stockMap, pricedInventoryItems] = await Promise.all([
    prisma.dish.findMany({
      where: dishWhere,
        include: {
          store: {
            select: { id: true, nameEn: true, vatPercentage: true }
          },
          category: true,
          subCategory: true,
          stockItems: true
      },
      orderBy: { nameEn: "asc" }
    }),
    prisma.stockItem.findMany({
      where: storeId ? { storeId } : {},
      select: { id: true, dishId: true, quantity: true, lowStockLevel: true, name: true, price: true, supplier: true, storeId: true }
    }),
    prisma.stockItem.findMany({
      where: inventoryWhere,
      include: {
        store: {
          select: { id: true, nameEn: true, vatPercentage: true }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  const stockByDish = stockMap.reduce((accumulator, item) => {
    if (item.dishId) {
      accumulator[item.dishId] = item;
    }
    return accumulator;
  }, {});

  const dishProducts = dishes.map((dish) => {
    const stock = stockByDish[dish.id] || { quantity: 0, lowStockLevel: 5 };
    return {
      ...dish,
      id: `dish-${dish.id}`,
      productId: dish.id,
      productType: "dish",
      nameEn: dish.nameEn,
      price: Number(dish.price),
      storeId: dish.storeId,
      storeName: dish.store?.nameEn || "Unknown store",
      storeVatPercentage: Number(dish.store?.vatPercentage || 0),
      stock: stock.quantity,
      lowStockLevel: stock.lowStockLevel,
      isLowStock: stock.quantity <= stock.lowStockLevel,
      supplier: null
    };
  });

  const inventoryProducts = pricedInventoryItems.map((item) => ({
    id: `stock-${item.id}`,
    productId: item.id,
    productType: "stock",
    nameEn: item.name || "Unnamed item",
    price: Number(item.price || 0),
    storeId: item.storeId,
    storeName: item.store?.nameEn || "Unknown store",
    storeVatPercentage: Number(item.store?.vatPercentage || 0),
    stock: item.quantity,
    lowStockLevel: item.lowStockLevel,
    isLowStock: item.quantity <= item.lowStockLevel,
    categoryId: "__inventory__",
    category: { id: "__inventory__", nameEn: "Inventory", icon: "📦" },
    subCategory: null,
    supplier: item.supplier
  }));

  if (categoryId === "__inventory__") {
    return inventoryProducts;
  }

  if (categoryId) {
    return dishProducts;
  }

  return [...dishProducts, ...inventoryProducts];
}

export async function createOrder(storeId, orderData) {
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { vatNumber: true, vatPercentage: true }
  });
  if (!store) {
    throw new Error("Store not found");
  }

  const vatPercentage = Number(store?.vatPercentage || 0);
  const grossAmount = orderData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const { subtotalAmount, vatAmount, totalAmount } = calculateVatInclusiveTotals(grossAmount, vatPercentage);

  const order = await prisma.order.create({
    data: {
      storeId,
      invoiceNumber,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      status: "PENDING",
      subtotalAmount,
      vatAmount,
      vatPercentage,
      vatNumber: store?.vatNumber || null,
      totalAmount,
      items: {
        create: orderData.items.map((item) => ({
          dishId: item.productType === "dish" ? item.productId : null,
          stockItemId: item.productType === "stock" ? item.productId : null,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      }
    },
    include: { items: { include: { dish: true, stockItem: true } } }
  });

  for (const item of orderData.items) {
    if (item.productType === "dish") {
      await prisma.stockItem.updateMany({
        where: { storeId, dishId: item.productId },
        data: { quantity: { decrement: item.quantity } }
      });
      continue;
    }

    if (item.productType === "stock") {
      await prisma.stockItem.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } }
      });
    }
  }

  await emitNotificationEvent("order.created", {
    storeId,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    totalAmount: formatCurrency(order.totalAmount)
  });

  return order;
}
