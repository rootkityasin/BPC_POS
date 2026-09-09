import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

function clampCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getOrderTotal(order) {
  return Number(order.totalAmount || 0);
}

function getBangladeshStartOfDay(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const dateStr = formatter.format(date);
    return new Date(`${dateStr}T00:00:00+06:00`);
  } catch {
    return startOfDay(date);
  }
}

function getBangladeshEndOfDay(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const dateStr = formatter.format(date);
    return new Date(`${dateStr}T23:59:59.999+06:00`);
  } catch {
    return endOfDay(date);
  }
}

export function getOrderHour(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      hour12: false,
      hourCycle: "h23"
    }).formatToParts(new Date(date));
    const h = parts.find((p) => p.type === "hour")?.value;
    return h !== undefined ? Number(h) : new Date(date).getHours();
  } catch {
    return new Date(date).getHours();
  }
}

function getInsightWindow() {
  const todayEnd = getBangladeshEndOfDay(new Date());
  return { from: getBangladeshStartOfDay(subDays(new Date(), 29)), to: todayEnd };
}

function resolveView(filters = {}) {
  const validViews = new Set(["accumulated", "shift", "weekly", "daily"]);
  const requestedView = String(filters.view || filters.range || "daily").toLowerCase();
  return validViews.has(requestedView) ? requestedView : "daily";
}

function resolveWindow(view) {
  const now = new Date();
  const todayStart = getBangladeshStartOfDay(now);
  const todayEnd = getBangladeshEndOfDay(now);

  if (view === "accumulated") {
    return {
      view,
      from: new Date(0),
      to: todayEnd,
      previousRange: null
    };
  }

  if (view === "weekly") {
    const from = getBangladeshStartOfDay(subDays(now, 6));
    const to = todayEnd;
    return {
      view,
      from,
      to,
      previousRange: {
        from: getBangladeshStartOfDay(subDays(from, 7)),
        to: getBangladeshEndOfDay(subDays(from, 1))
      }
    };
  }

  if (view === "shift") {
    return {
      view,
      from: todayStart,
      to: todayEnd,
      previousRange: {
        from: getBangladeshStartOfDay(subDays(now, 1)),
        to: getBangladeshEndOfDay(subDays(now, 1))
      }
    };
  }

  return {
    view: "daily",
    from: todayStart,
    to: todayEnd,
    previousRange: {
      from: getBangladeshStartOfDay(subDays(now, 1)),
      to: getBangladeshEndOfDay(subDays(now, 1))
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
    netSales: 0,
    totalRefunds: 0,
    totalOrders: orders.length,
    productsSold: 0,
    newCustomers: 0,
    totalVat: 0,
    averageOrderValue: 0
  };
  const seenNewCustomers = new Set();

  for (const order of orders) {
    summary.totalSales += Number(order.totalAmount || 0);
    summary.totalVat += Number(order.vatAmount || 0);

    for (const item of order.items || []) {
      summary.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
      summary.totalRefunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
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
  summary.totalRefunds = clampCurrency(summary.totalRefunds);
  summary.totalVat = clampCurrency(summary.totalVat);
  summary.netSales = clampCurrency(Math.max(0, summary.totalSales - summary.totalRefunds));
  summary.averageOrderValue = summary.totalOrders > 0
    ? clampCurrency(summary.totalSales / summary.totalOrders)
    : 0;

  return summary;
}

function buildDelta(current, previous) {
  if (previous === null || previous === undefined) return { value: 0, label: "No previous data" };
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, label: current > 0 ? "+100% vs prev" : "No change" };
  }

  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  return {
    value: rounded,
    label: `${rounded >= 0 ? "+" : ""}${rounded}% vs prev`
  };
}

function getShiftLabel(hour) {
  if (hour < 8) return "12 AM - 08 AM";
  if (hour < 16) return "08 AM - 04 PM";
  return "04 PM - 12 AM";
}

export function buildShiftBreakdown(orders) {
  const shiftOrder = ["12 AM - 08 AM", "08 AM - 04 PM", "04 PM - 12 AM"];
  const totals = new Map(shiftOrder.map((label) => [label, { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 }]));

  for (const order of orders) {
    const label = getShiftLabel(getOrderHour(order.createdAt));
    const curr = totals.get(label) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
    const rev = getOrderTotal(order);
    curr.revenue += rev;
    curr.orders += 1;
    curr.vat += Number(order.vatAmount || 0);

    for (const item of order.items || []) {
      curr.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
      curr.refunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
    }
    totals.set(label, curr);
  }

  return {
    labels: shiftOrder,
    values: shiftOrder.map((label) => clampCurrency(totals.get(label)?.revenue || 0)),
    netSalesValues: shiftOrder.map((label) => clampCurrency(Math.max(0, (totals.get(label)?.revenue || 0) - (totals.get(label)?.refunds || 0)))),
    orderCounts: shiftOrder.map((label) => totals.get(label)?.orders || 0),
    productsSoldValues: shiftOrder.map((label) => totals.get(label)?.productsSold || 0),
    aovValues: shiftOrder.map((label) => {
      const o = totals.get(label);
      return o && o.orders > 0 ? clampCurrency(o.revenue / o.orders) : 0;
    }),
    vatValues: shiftOrder.map((label) => clampCurrency(totals.get(label)?.vat || 0)),
    refundValues: shiftOrder.map((label) => clampCurrency(totals.get(label)?.refunds || 0))
  };
}

export function buildHourlyBreakdown(orders) {
  const totals = new Map(Array.from({ length: 24 }, (_, hour) => [hour, { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 }]));

  for (const order of orders) {
    const hour = getOrderHour(order.createdAt);
    const curr = totals.get(hour) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
    const rev = getOrderTotal(order);
    curr.revenue += rev;
    curr.orders += 1;
    curr.vat += Number(order.vatAmount || 0);

    for (const item of order.items || []) {
      curr.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
      curr.refunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
    }
    totals.set(hour, curr);
  }

  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return {
    labels: hours.map((h) => `${String(h).padStart(2, "0")}:00`),
    values: hours.map((h) => clampCurrency(totals.get(h)?.revenue || 0)),
    netSalesValues: hours.map((h) => clampCurrency(Math.max(0, (totals.get(h)?.revenue || 0) - (totals.get(h)?.refunds || 0)))),
    orderCounts: hours.map((h) => totals.get(h)?.orders || 0),
    productsSoldValues: hours.map((h) => totals.get(h)?.productsSold || 0),
    aovValues: hours.map((h) => {
      const o = totals.get(h);
      return o && o.orders > 0 ? clampCurrency(o.revenue / o.orders) : 0;
    }),
    vatValues: hours.map((h) => clampCurrency(totals.get(h)?.vat || 0)),
    refundValues: hours.map((h) => clampCurrency(totals.get(h)?.refunds || 0))
  };
}

export function buildWeeklyBreakdown(orders) {
  const buckets = new Map();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = getBangladeshStartOfDay(subDays(new Date(), offset));
    buckets.set(day.toISOString().slice(0, 10), {
      label: format(day, "EEE"),
      revenue: 0,
      orders: 0,
      refunds: 0,
      productsSold: 0,
      vat: 0
    });
  }

  for (const order of orders) {
    const dayKey = getBangladeshStartOfDay(new Date(order.createdAt)).toISOString().slice(0, 10);
    if (!buckets.has(dayKey)) continue;
    const b = buckets.get(dayKey);
    const rev = getOrderTotal(order);
    b.revenue += rev;
    b.orders += 1;
    b.vat += Number(order.vatAmount || 0);

    for (const item of order.items || []) {
      b.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
      b.refunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
    }
  }

  const list = [...buckets.values()];

  return {
    labels: list.map((b) => b.label),
    values: list.map((b) => clampCurrency(b.revenue)),
    netSalesValues: list.map((b) => clampCurrency(Math.max(0, b.revenue - b.refunds))),
    orderCounts: list.map((b) => b.orders),
    productsSoldValues: list.map((b) => b.productsSold),
    aovValues: list.map((b) => (b.orders > 0 ? clampCurrency(b.revenue / b.orders) : 0)),
    vatValues: list.map((b) => clampCurrency(b.vat)),
    refundValues: list.map((b) => clampCurrency(b.refunds))
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
      const curr = totals.get(label) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
      curr.revenue += Number(order.totalAmount || 0);
      curr.orders += 1;
      curr.vat += Number(order.vatAmount || 0);
      for (const item of order.items || []) {
        curr.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
        curr.refunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
      }
      totals.set(label, curr);
    }
  } else if (scopeMode === "all-stores") {
    for (const order of orders) {
      const label = order.store?.nameEn || "Unknown store";
      const curr = totals.get(label) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
      curr.revenue += Number(order.totalAmount || 0);
      curr.orders += 1;
      curr.vat += Number(order.vatAmount || 0);
      for (const item of order.items || []) {
        curr.productsSold += Math.max(0, Number(item.quantity || 0) - Number(item.refundedQuantity || 0));
        curr.refunds += Number(item.refundedQuantity || 0) * Number(item.unitPrice || 0);
      }
      totals.set(label, curr);
    }
  } else {
    for (const order of orders) {
      for (const item of order.items || []) {
        if (breakdown === "others") {
          if (item.dish) continue;
          const label = item.stockItem?.name || item.itemName || "Others Sell";
          const curr = totals.get(label) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
          const sales = Number(item.unitPrice || 0) * Number(item.quantity || 0);
          curr.revenue += sales;
          curr.orders += Number(item.quantity || 0);
          curr.productsSold += Number(item.quantity || 0);
          totals.set(label, curr);
          continue;
        }

        const label = breakdown === "subcategory"
          ? item.dish?.subCategory?.nameEn || item.dish?.category?.nameEn || item.stockItem?.name || item.itemName || "Uncategorized"
          : item.dish?.category?.nameEn || item.stockItem?.name || item.itemName || "Uncategorized";
        const curr = totals.get(label) || { revenue: 0, orders: 0, refunds: 0, productsSold: 0, vat: 0 };
        const sales = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        curr.revenue += sales;
        curr.orders += Number(item.quantity || 0);
        curr.productsSold += Number(item.quantity || 0);
        totals.set(label, curr);
      }
    }
  }

  const entries = [...totals.entries()]
    .map(([label, val]) => ({
      label,
      value: clampCurrency(val.revenue),
      netSales: clampCurrency(Math.max(0, val.revenue - (val.refunds || 0))),
      orders: val.orders,
      productsSold: val.productsSold || 0,
      aov: val.orders > 0 ? clampCurrency(val.revenue / val.orders) : 0,
      vat: clampCurrency(val.vat || 0),
      refunds: clampCurrency(val.refunds || 0)
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  return {
    labels: entries.map((entry) => entry.label),
    values: entries.map((entry) => entry.value),
    netSalesValues: entries.map((entry) => entry.netSales),
    orderCounts: entries.map((entry) => entry.orders),
    productsSoldValues: entries.map((entry) => entry.productsSold),
    aovValues: entries.map((entry) => entry.aov),
    vatValues: entries.map((entry) => entry.vat),
    refundValues: entries.map((entry) => entry.refunds)
  };
}

function buildSalesBreakdown(orders, scopeMode, view, breakdown) {
  if (view === "shift") return buildShiftBreakdown(orders);
  if (view === "weekly") return buildWeeklyBreakdown(orders);
  if (view === "daily") return buildHourlyBreakdown(orders);
  return buildBreakdown(orders, scopeMode, breakdown);
}

export function buildMealPeriodBreakdown(orders) {
  const periods = [
    { key: "breakfast", labelEn: "Breakfast", labelBn: "সকালের নাস্তা", timeWindow: "05:00 AM - 11:00 AM", revenue: 0, orders: 0, color: "#f59e0b" },
    { key: "lunch", labelEn: "Lunch", labelBn: "দুপুরের খাবার", timeWindow: "11:00 AM - 03:00 PM", revenue: 0, orders: 0, color: "#2771cb" },
    { key: "snacks", labelEn: "Snacks & Tea", labelBn: "বিকালের নাস্তা", timeWindow: "03:00 PM - 06:00 PM", revenue: 0, orders: 0, color: "#8b5cf6" },
    { key: "dinner", labelEn: "Dinner", labelBn: "রাতের খাবার", timeWindow: "06:00 PM - 05:00 AM", revenue: 0, orders: 0, color: "#10b981" }
  ];

  let totalPeriodRevenue = 0;

  for (const order of orders) {
    const hour = getOrderHour(order.createdAt);
    const amount = getOrderTotal(order);
    totalPeriodRevenue += amount;

    let targetKey = "dinner";
    if (hour >= 5 && hour < 11) targetKey = "breakfast";
    else if (hour >= 11 && hour < 15) targetKey = "lunch";
    else if (hour >= 15 && hour < 18) targetKey = "snacks";

    const p = periods.find((item) => item.key === targetKey);
    if (p) {
      p.revenue += amount;
      p.orders += 1;
    }
  }

  return periods.map((p) => ({
    ...p,
    revenue: clampCurrency(p.revenue),
    sharePct: totalPeriodRevenue > 0 ? Math.round((p.revenue / totalPeriodRevenue) * 100) : 0
  }));
}

export function findPeakHour(orders) {
  if (!orders.length) return null;
  const hourMap = new Map();
  for (const order of orders) {
    const hour = getOrderHour(order.createdAt);
    const curr = hourMap.get(hour) || { hour, revenue: 0, orders: 0 };
    curr.revenue += getOrderTotal(order);
    curr.orders += 1;
    hourMap.set(hour, curr);
  }

  const sorted = [...hourMap.values()].sort((a, b) => b.revenue - a.revenue);
  if (!sorted.length || sorted[0].revenue === 0) return null;

  const peak = sorted[0];
  const startHour = peak.hour;
  const endHour = (startHour + 1) % 24;
  const formatHour = (h) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  return {
    hour: peak.hour,
    windowLabel: `${formatHour(startHour)} - ${formatHour(endHour)}`,
    revenue: clampCurrency(peak.revenue),
    orders: peak.orders
  };
}

export function buildCategoryDistribution(orders) {
  const categories = new Map();
  let totalCategorySales = 0;

  for (const order of orders) {
    for (const item of order.items || []) {
      const catName = item.dish?.category?.nameEn || (item.stockItem ? "Inventory Stock" : "Other");
      const catNameBn = item.dish?.category?.nameBn || null;
      const sales = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      const units = Number(item.quantity || 0);

      const existing = categories.get(catName) || { nameEn: catName, nameBn: catNameBn, revenue: 0, units: 0 };
      existing.revenue += sales;
      existing.units += units;
      categories.set(catName, existing);
      totalCategorySales += sales;
    }
  }

  const palette = ["#2771cb", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"];

  return [...categories.values()]
    .map((cat, i) => ({
      ...cat,
      revenue: clampCurrency(cat.revenue),
      color: palette[i % palette.length],
      sharePct: totalCategorySales > 0 ? Math.round((cat.revenue / totalCategorySales) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildRecentOrders(orders) {
  return orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      customerName: o.customerName || "Walk-in Guest",
      customerPhone: o.customerPhone || null,
      status: o.status,
      totalAmount: clampCurrency(o.totalAmount),
      itemsCount: (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0),
      firstItemName: o.items?.[0]?.itemName || "Item",
      createdAt: o.createdAt.toISOString(),
      storeName: o.store?.nameEn || ""
    }));
}

export function buildStoreLeaderboard(orders) {
  const storeMap = new Map();
  let grandTotal = 0;

  for (const order of orders) {
    const storeName = order.store?.nameEn || "Unknown store";
    const amount = getOrderTotal(order);
    grandTotal += amount;

    const curr = storeMap.get(storeName) || { storeName, revenue: 0, orders: 0 };
    curr.revenue += amount;
    curr.orders += 1;
    storeMap.set(storeName, curr);
  }

  return [...storeMap.values()]
    .map((st) => ({
      ...st,
      revenue: clampCurrency(st.revenue),
      sharePct: grandTotal > 0 ? Math.round((st.revenue / grandTotal) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);
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
      ? "All-time sales across all stores."
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
      const nameBn = item.dish?.nameBn || item.stockItem?.nameBn || null;
      const current = totals.get(name) || { name, nameBn, quantity: 0, sales: 0 };
      current.quantity += Number(item.quantity || 0);
      current.sales += Number(item.unitPrice || 0) * Number(item.quantity || 0);
      totals.set(name, current);
      quantityTotal += Number(item.quantity || 0);
      salesTotal += Number(item.unitPrice || 0) * Number(item.quantity || 0);
    }
  }

  const colors = ["#2771cb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

  return [...totals.values()]
    .sort((left, right) => right.sales - left.sales)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      sales: clampCurrency(item.sales),
      popularityPct: quantityTotal ? Math.round((item.quantity / quantityTotal) * 100) : 0,
      salesPct: salesTotal ? Math.round((item.sales / salesTotal) * 100) : 0,
      color: colors[index % colors.length]
    }));
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
            items: { select: { quantity: true, unitPrice: true, refundedQuantity: true } }
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
      netSales: summary.netSales,
      totalRefunds: summary.totalRefunds,
      totalOrders: summary.totalOrders,
      productsSold: summary.productsSold,
      newCustomers: summary.newCustomers,
      totalVat: summary.totalVat,
      averageOrderValue: summary.averageOrderValue,
      repeatCustomerRate: summary.totalOrders > 0 ? Math.round(Math.max(0, (summary.totalOrders - summary.newCustomers) / summary.totalOrders) * 100) : 0,
      deltas: {
        totalSales: buildDelta(summary.totalSales, previousSummary?.totalSales),
        netSales: buildDelta(summary.netSales, previousSummary?.netSales),
        totalRefunds: buildDelta(summary.totalRefunds, previousSummary?.totalRefunds),
        totalOrders: buildDelta(summary.totalOrders, previousSummary?.totalOrders),
        productsSold: buildDelta(summary.productsSold, previousSummary?.productsSold),
        newCustomers: buildDelta(summary.newCustomers, previousSummary?.newCustomers),
        averageOrderValue: buildDelta(summary.averageOrderValue, previousSummary?.averageOrderValue)
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
    mealPeriods: buildMealPeriodBreakdown(orders),
    peakHour: findPeakHour(orders),
    hourlyActivity: buildHourlyBreakdown(orders),
    categoryDistribution: buildCategoryDistribution(orders),
    recentOrders: buildRecentOrders(orders),
    storeLeaderboard: scopeMode === "all-stores" ? buildStoreLeaderboard(orders) : [],
    reportView: view,
    topProducts: buildTopProducts(orders)
  };
}
