import { prisma } from "@/lib/prisma";

function buildCustomerScope(user, storeId) {
  if (user.role !== "SUPER_ADMIN") {
    return user.storeId ? { storeId: user.storeId } : { storeId: "__NO_STORE__" };
  }

  if (storeId) {
    return { storeId };
  }

  return {};
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function normalizeDateStart(value) {
  const text = sanitizeText(value);
  if (!text) return null;

  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateEnd(value) {
  const text = sanitizeText(value);
  if (!text) return null;

  const date = new Date(`${text}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCustomerFilters(filters = {}) {
  const invoiceSuffix = sanitizeText(filters.invoiceSuffix);
  const customerName = sanitizeText(filters.customerName);
  const fromDate = normalizeDateStart(filters.fromDate);
  const toDate = normalizeDateEnd(filters.toDate);
  const andClauses = [];

  if (invoiceSuffix) {
    andClauses.push({ invoiceNumber: { endsWith: invoiceSuffix } });
  }

  if (customerName) {
    andClauses.push({ customerName: { contains: customerName, mode: "insensitive" } });
  }

  if (fromDate || toDate) {
    andClauses.push({
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      }
    });
  }

  return andClauses;
}

function buildCustomerKey(order) {
  const phone = String(order.customerPhone || "").trim();
  const name = String(order.customerName || "").trim().toLowerCase();
  const identity = phone || name;
  return identity ? `${order.storeId}:${identity}` : "";
}

export async function getCustomerDashboard(user, storeId, filters = {}) {
  const orders = await prisma.order.findMany({
    where: {
      ...buildCustomerScope(user, storeId),
      AND: buildCustomerFilters(filters),
      OR: [
        { customerName: { not: null } },
        { customerPhone: { not: null } }
      ]
    },
    include: {
      store: true,
      items: {
        orderBy: { id: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const customersByKey = new Map();

  for (const order of orders) {
    const key = buildCustomerKey(order);
    if (!key) continue;

    const existing = customersByKey.get(key);
    const orderSummary = {
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      createdAt: order.createdAt,
      status: order.status,
      totalAmount: Number(order.totalAmount || 0),
      itemCount: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      itemSummary: order.items.map((item) => `${item.itemName} x${item.quantity}`).join(", "),
      storeName: order.store?.nameEn || "Unknown store"
    };

    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += orderSummary.totalAmount;
      if (!existing.name && order.customerName) {
        existing.name = order.customerName;
      }
      if (!existing.phone && order.customerPhone) {
        existing.phone = order.customerPhone;
      }
      existing.orders.push(orderSummary);
      continue;
    }

    customersByKey.set(key, {
      id: key,
      name: order.customerName || "Walk-in customer",
      phone: order.customerPhone || "",
      lastOrderAt: order.createdAt,
      orderCount: 1,
      totalSpent: orderSummary.totalAmount,
      storeName: order.store?.nameEn || "Unknown store",
      orders: [orderSummary]
    });
  }

  const customers = Array.from(customersByKey.values())
    .map((customer) => ({
      ...customer,
      totalSpent: Number(customer.totalSpent || 0),
      recentOrders: customer.orders.slice(0, 5)
    }))
    .sort((left, right) => Number(new Date(right.lastOrderAt)) - Number(new Date(left.lastOrderAt)));

  const totals = customers.reduce((accumulator, customer) => {
    accumulator.customerCount += 1;
    accumulator.orderCount += customer.orderCount;
    accumulator.revenue += customer.totalSpent;
    return accumulator;
  }, { customerCount: 0, orderCount: 0, revenue: 0 });

  return {
    customers,
    totals
  };
}
