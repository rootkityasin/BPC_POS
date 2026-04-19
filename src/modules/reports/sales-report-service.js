import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

function clampCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getOrderTotal(order) {
  return Number(order.totalAmount || 0);
}

function getInsightWindow() {
  const todayEnd = endOfDay(new Date());
  return { from: startOfDay(subDays(new Date(), 29)), to: todayEnd };
}

function resolveView(filters = {}) {
  const validViews = new Set(["accumulated", "shift", "weekly", "daily"]);
  const requestedView = String(filters.view || filters.range || "daily").toLowerCase();
  return validViews.has(requestedView) ? requestedView : "daily";
}

function resolveWindow(view) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (view === "accumulated") {
    return {
      view,
      from: new Date(0),
      to: todayEnd,
      previousRange: null
    };
  }

  if (view === "weekly") {
    const from = startOfDay(subDays(now, 6));
    const to = todayEnd;
    return {
      view,
      from,
      to,
      previousRange: {
        from: startOfDay(subDays(from, 7)),
        to: endOfDay(subDays(from, 1))
      }
    };
  }

  if (view === "shift") {
    return {
      view,
      from: todayStart,
      to: todayEnd,
      previousRange: {
        from: startOfDay(subDays(now, 1)),
        to: endOfDay(subDays(now, 1))
      }
    };
  }

  return {
    view: "daily",
    from: todayStart,
    to: todayEnd,
    previousRange: {
      from: startOfDay(subDays(now, 1)),
      to: endOfDay(subDays(now, 1))
    }
  };
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

function getShiftLabel(hour) {
  if (hour < 8) return "12 AM - 08 AM";
  if (hour < 16) return "08 AM - 04 PM";
  return "04 PM - 12 AM";
}

function buildShiftBreakdown(orders) {
  const shiftOrder = ["12 AM - 08 AM", "08 AM - 04 PM", "04 PM - 12 AM"];
  const totals = new Map(shiftOrder.map((label) => [label, 0]));

  for (const order of orders) {
    const label = getShiftLabel(new Date(order.createdAt).getHours());
    totals.set(label, (totals.get(label) || 0) + getOrderTotal(order));
  }

  return {
    labels: shiftOrder,
    values: shiftOrder.map((label) => clampCurrency(totals.get(label) || 0))
  };
}

function buildHourlyBreakdown(orders) {
  const totals = new Map(Array.from({ length: 24 }, (_, hour) => [hour, 0]));

  for (const order of orders) {
    const hour = new Date(order.createdAt).getHours();
    totals.set(hour, (totals.get(hour) || 0) + getOrderTotal(order));
  }

  return {
    labels: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}h`),
    values: Array.from({ length: 24 }, (_, hour) => clampCurrency(totals.get(hour) || 0))
  };
}

function buildWeeklyBreakdown(orders) {
  const buckets = new Map();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = startOfDay(subDays(new Date(), offset));
    buckets.set(day.toISOString().slice(0, 10), { label: format(day, "EEE"), value: 0 });
  }

  for (const order of orders) {
    const dayKey = startOfDay(new Date(order.createdAt)).toISOString().slice(0, 10);
    if (!buckets.has(dayKey)) continue;
    buckets.get(dayKey).value += getOrderTotal(order);
  }

  return {
    labels: [...buckets.values()].map((bucket) => bucket.label),
    values: [...buckets.values()].map((bucket) => clampCurrency(bucket.value))
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
        if (breakdown === "others") {
          if (item.dish) continue;
          const label = item.stockItem?.name || item.itemName || "Others Sell";
          totals.set(label, (totals.get(label) || 0) + (Number(item.unitPrice || 0) * Number(item.quantity || 0)));
          continue;
        }

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

function buildSalesBreakdown(orders, scopeMode, view, breakdown) {
  if (view === "shift") return buildShiftBreakdown(orders);
  if (view === "weekly") return buildWeeklyBreakdown(orders);
  if (view === "daily") return buildHourlyBreakdown(orders);
  return buildBreakdown(orders, scopeMode, breakdown);
}

function buildReportTitle(view, scopeMode) {
  if (view === "accumulated") return scopeMode === "all-stores" ? "Accumulated Sales" : "Store Accumulated Sales";
  if (view === "shift") return scopeMode === "all-stores" ? "Shift Wise Sell" : "Store Shift Wise Sell";
  if (view === "weekly") return scopeMode === "all-stores" ? "Weekly Sell" : "Store Weekly Sell";
  return scopeMode === "all-stores" ? "Daily Sell" : "Store Daily Sell";
}

function buildReportSubtitle(view, scopeMode) {
  if (view === "accumulated") {
    return scopeMode === "all-stores"
      ? "All-time sales across the selected scope."
      : "All-time sales for the active store scope.";
  }

  if (view === "shift") {
    return scopeMode === "all-stores"
      ? "Today's sales grouped into 8-hour shifts."
      : "Today's store sales grouped into 8-hour shifts.";
  }

  if (view === "weekly") {
    return scopeMode === "all-stores"
      ? "Last 7 days of sales grouped by day."
      : "Last 7 days of store sales grouped by day.";
  }

  return scopeMode === "all-stores"
    ? "Today's sales grouped by hour."
    : "Today's store sales grouped by hour.";
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
  const view = resolveView(filters);
  const currentRange = resolveWindow(view);
  const previousRange = currentRange.previousRange;
  const scopeMode = user.role === "SUPER_ADMIN" && !activeStoreId ? "all-stores" : "single-store";
  const breakdownOptions = view === "accumulated" && scopeMode === "all-stores"
    ? ["store", "day"]
    : view === "accumulated"
      ? ["category", "subcategory", "others", "day"]
      : [];
  const selectedBreakdown = breakdownOptions.includes(filters.breakdown) ? filters.breakdown : breakdownOptions[0] || view;
  const hasPreviousRange = Boolean(previousRange);

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
    previousRange
      ? prisma.order.findMany({
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
        })
      : Promise.resolve([]),
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
  const previousSummary = hasPreviousRange
    ? summarizeOrders(previousOrders, firstOrderByCustomer, orderCountByCustomer, previousRange.from, previousRange.to)
    : null;

  return {
    scopeMode,
    title: buildReportTitle(view, scopeMode),
    subtitle: buildReportSubtitle(view, scopeMode),
    filters: {
      view,
      breakdown: selectedBreakdown,
      breakdownOptions,
      viewOptions: ["accumulated", "shift", "weekly", "daily"]
    },
    summary: {
      totalSales: summary.totalSales,
      totalOrders: summary.totalOrders,
      productsSold: summary.productsSold,
      newCustomers: summary.newCustomers,
      deltas: {
        totalSales: buildDelta(summary.totalSales, previousSummary?.totalSales),
        totalOrders: buildDelta(summary.totalOrders, previousSummary?.totalOrders),
        productsSold: buildDelta(summary.productsSold, previousSummary?.productsSold),
        newCustomers: buildDelta(summary.newCustomers, previousSummary?.newCustomers)
      }
    },
    visitorInsights: buildVisitorInsights(
      orders,
      firstOrderByCustomer,
      orderCountByCustomer,
      view === "accumulated" ? getInsightWindow().from : currentRange.from,
      currentRange.to
    ),
    salesBreakdown: buildSalesBreakdown(orders, scopeMode, view, selectedBreakdown),
    reportView: view,
    topProducts: buildTopProducts(orders)
  };
}
