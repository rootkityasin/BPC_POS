import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

function normalizeDate(value, fallback) {
  const date = value ? new Date(String(value)) : fallback;
  return Number.isNaN(date?.getTime?.()) ? fallback : date;
}

function clampCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildScope(user, storeId) {
  if (user.role !== "SUPER_ADMIN") {
    return user.storeId ? { storeId: user.storeId } : { storeId: "__NO_STORE__" };
  }

  if (storeId) {
    return { storeId };
  }

  return {};
}

function resolveRange(filters = {}) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const range = String(filters.range || "today");

  if (range === "7d") {
    return { range, from: startOfDay(subDays(new Date(), 6)), to: todayEnd };
  }

  if (range === "30d") {
    return { range, from: startOfDay(subDays(new Date(), 29)), to: todayEnd };
  }

  if (range === "month") {
    return { range, from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
  }

  if (range === "custom") {
    const from = startOfDay(normalizeDate(filters.from, todayStart));
    const to = endOfDay(normalizeDate(filters.to, todayEnd));
    return from <= to ? { range, from, to } : { range, from: to, to: from };
  }

  return { range: "today", from: todayStart, to: todayEnd };
}

function buildPreviousRange(currentRange) {
  const duration = currentRange.to.getTime() - currentRange.from.getTime();
  const previousTo = new Date(currentRange.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);
  return { from: previousFrom, to: previousTo };
}

function getCustomerKey(order) {
  const phone = String(order.customerPhone || "").trim();
  if (phone) return `phone:${phone}`;

  const name = String(order.customerName || "").trim().toLowerCase();
  if (name) return `name:${name}`;

  return null;
}

function summarizeOrders(orders, firstOrderByCustomer = new Map(), orderCountByCustomer = new Map(), rangeStart = null, rangeEnd = null) {
  const summary = {
    totalSales: 0,
    totalOrders: orders.length,
    productsSold: 0,
    newCustomers: 0
  };
  const seenNewCustomers = new Set();

  for (const order of orders) {
    summary.totalSales += Number(order.totalAmount || 0);
    for (const item of order.items || []) {
      summary.productsSold += Number(item.quantity || 0);
    }

    const customerKey = getCustomerKey(order);
    if (!customerKey || !rangeStart || !rangeEnd) continue;

    const firstSeen = firstOrderByCustomer.get(customerKey);
    if (firstSeen && firstSeen >= rangeStart && firstSeen <= rangeEnd && !seenNewCustomers.has(customerKey)) {
      seenNewCustomers.add(customerKey);
      summary.newCustomers += 1;
    }
  }

  summary.totalSales = clampCurrency(summary.totalSales);
  return summary;
}

function buildDelta(current, previous) {
  if (!previous) return { value: 0, label: "No previous data" };
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, label: current > 0 ? "+100% from previous period" : "No change" };
  }

  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  return {
    value: rounded,
    label: `${rounded >= 0 ? "+" : ""}${rounded}% from previous period`
  };
}

function buildBuckets(from, to) {
  const totalDays = Math.max(1, Math.ceil((endOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1);
  const bucketSize = Math.max(1, Math.ceil(totalDays / 7));
  const buckets = [];
  let cursor = startOfDay(from);

  while (cursor <= to) {
    const bucketStart = cursor;
    const bucketEnd = endOfDay(new Date(Math.min(to.getTime(), bucketStart.getTime() + ((bucketSize - 1) * 86400000))));
    buckets.push({
      key: `${bucketStart.toISOString()}-${bucketEnd.toISOString()}`,
      label: format(bucketStart, bucketSize > 1 ? "dd MMM" : "EEE"),
      from: bucketStart,
      to: bucketEnd,
      orderCount: 0,
      customers: new Set(),
      newCustomers: new Set(),
      loyalCustomers: new Set()
    });
    cursor = startOfDay(new Date(bucketEnd.getTime() + 86400000));
  }

  return buckets;
}

function buildVisitorInsights(orders, firstOrderByCustomer, orderCountByCustomer, from, to) {
  const buckets = buildBuckets(from, to);

  for (const order of orders) {
    const customerKey = getCustomerKey(order);
    const createdAt = new Date(order.createdAt);
    const bucket = buckets.find((entry) => createdAt >= entry.from && createdAt <= entry.to);
    if (!bucket) continue;

    bucket.orderCount += 1;
    if (!customerKey) continue;

    bucket.customers.add(customerKey);

    const firstSeen = firstOrderByCustomer.get(customerKey);
    if (firstSeen && firstSeen >= bucket.from && firstSeen <= bucket.to) {
      bucket.newCustomers.add(customerKey);
    }

    if ((orderCountByCustomer.get(customerKey) || 0) > 1) {
      bucket.loyalCustomers.add(customerKey);
    }
  }

  return {
    labels: buckets.map((bucket) => bucket.label),
    series: [
      { label: "Loyal Customers", color: "#7c3aed", values: buckets.map((bucket) => bucket.loyalCustomers.size) },
      { label: "New Customers", color: "#ef4444", values: buckets.map((bucket) => bucket.newCustomers.size) },
      { label: "Unique Customers", color: "#22c55e", values: buckets.map((bucket) => bucket.customers.size) }
    ]
  };
}

function buildBreakdown(orders, scopeMode, breakdown) {
  const totals = new Map();

  if (breakdown === "day") {
    for (const order of orders) {
      const label = format(new Date(order.createdAt), "dd MMM");
      totals.set(label, (totals.get(label) || 0) + Number(order.totalAmount || 0));
    }
  } else if (scopeMode === "all-stores") {
    for (const order of orders) {
      const label = order.store?.nameEn || "Unknown store";
      totals.set(label, (totals.get(label) || 0) + Number(order.totalAmount || 0));
    }
  } else {
    for (const order of orders) {
      for (const item of order.items || []) {
        const label = breakdown === "subcategory"
          ? item.dish?.subCategory?.nameEn || item.dish?.category?.nameEn || item.stockItem?.name || item.itemName || "Uncategorized"
          : item.dish?.category?.nameEn || item.stockItem?.name || item.itemName || "Uncategorized";
        totals.set(label, (totals.get(label) || 0) + (Number(item.unitPrice || 0) * Number(item.quantity || 0)));
      }
    }
  }

  const entries = [...totals.entries()]
    .map(([label, value]) => ({ label, value: clampCurrency(value) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  return {
    labels: entries.map((entry) => entry.label),
    values: entries.map((entry) => entry.value)
  };
}

function buildTopProducts(orders) {
  const totals = new Map();
  let quantityTotal = 0;
  let salesTotal = 0;

  for (const order of orders) {
    for (const item of order.items || []) {
      const name = item.dish?.nameEn || item.stockItem?.name || item.itemName || "Item";
      const current = totals.get(name) || { quantity: 0, sales: 0 };
      current.quantity += Number(item.quantity || 0);
      current.sales += Number(item.unitPrice || 0) * Number(item.quantity || 0);
      totals.set(name, current);
      quantityTotal += Number(item.quantity || 0);
      salesTotal += Number(item.unitPrice || 0) * Number(item.quantity || 0);
    }
  }

  const colors = ["#3b82f6", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444"];

  return [...totals.entries()]
    .map(([name, value], index) => ({
      rank: index + 1,
      name,
      quantity: value.quantity,
      sales: clampCurrency(value.sales),
      popularityPct: quantityTotal ? Math.round((value.quantity / quantityTotal) * 100) : 0,
      salesPct: salesTotal ? Math.round((value.sales / salesTotal) * 100) : 0,
      color: colors[index % colors.length]
    }))
    .sort((left, right) => right.sales - left.sales)
    .slice(0, 4)
    .map((item, index) => ({ ...item, rank: index + 1, color: colors[index % colors.length] }));
}

export async function getSalesReportDashboard(user, activeStoreId, filters = {}) {
  const scope = buildScope(user, activeStoreId);
  const currentRange = resolveRange(filters);
  const previousRange = buildPreviousRange(currentRange);
  const scopeMode = user.role === "SUPER_ADMIN" && !activeStoreId ? "all-stores" : "single-store";
  const breakdownOptions = scopeMode === "all-stores"
    ? ["store", "day"]
    : ["category", "subcategory", "day"];
  const selectedBreakdown = breakdownOptions.includes(filters.breakdown) ? filters.breakdown : breakdownOptions[0];

  const [orders, previousOrders, historicalCustomers] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...scope,
        createdAt: {
          gte: currentRange.from,
          lte: currentRange.to
        }
      },
      orderBy: { createdAt: "asc" },
      include: {
        store: { select: { id: true, nameEn: true } },
        items: {
          include: {
            dish: { include: { category: true, subCategory: true } },
            stockItem: true
          }
        }
      }
    }),
    prisma.order.findMany({
      where: {
        ...scope,
        createdAt: {
          gte: previousRange.from,
          lte: previousRange.to
        }
      },
      include: {
        items: { select: { quantity: true } }
      }
    }),
    prisma.order.findMany({
      where: scope,
      select: {
        customerName: true,
        customerPhone: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const firstOrderByCustomer = new Map();
  const orderCountByCustomer = new Map();

  for (const order of historicalCustomers) {
    const customerKey = getCustomerKey(order);
    if (!customerKey) continue;

    if (!firstOrderByCustomer.has(customerKey)) {
      firstOrderByCustomer.set(customerKey, new Date(order.createdAt));
    }

    orderCountByCustomer.set(customerKey, (orderCountByCustomer.get(customerKey) || 0) + 1);
  }

  const summary = summarizeOrders(orders, firstOrderByCustomer, orderCountByCustomer, currentRange.from, currentRange.to);
  const previousSummary = summarizeOrders(previousOrders, firstOrderByCustomer, orderCountByCustomer, previousRange.from, previousRange.to);

  return {
    scopeMode,
    title: scopeMode === "all-stores" ? "Sales Report" : "Store Sales Report",
    subtitle: scopeMode === "all-stores"
      ? "Cross-store performance, customer activity, and best-selling products."
      : "Branch-level performance, customer activity, and top-selling products.",
    filters: {
      range: currentRange.range,
      from: format(currentRange.from, "yyyy-MM-dd"),
      to: format(currentRange.to, "yyyy-MM-dd"),
      breakdown: selectedBreakdown,
      breakdownOptions
    },
    summary: {
      totalSales: summary.totalSales,
      totalOrders: summary.totalOrders,
      productsSold: summary.productsSold,
      newCustomers: summary.newCustomers,
      deltas: {
        totalSales: buildDelta(summary.totalSales, previousSummary.totalSales),
        totalOrders: buildDelta(summary.totalOrders, previousSummary.totalOrders),
        productsSold: buildDelta(summary.productsSold, previousSummary.productsSold),
        newCustomers: buildDelta(summary.newCustomers, previousSummary.newCustomers)
      }
    },
    visitorInsights: buildVisitorInsights(orders, firstOrderByCustomer, orderCountByCustomer, currentRange.from, currentRange.to),
    salesBreakdown: buildBreakdown(orders, scopeMode, selectedBreakdown),
    topProducts: buildTopProducts(orders)
  };
}
