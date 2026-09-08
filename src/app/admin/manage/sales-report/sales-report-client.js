"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Download,
  Printer,
  TrendingUp,
  Clock,
  ShoppingBag,
  RotateCcw,
  Users,
  UtensilsCrossed,
  Receipt,
  Layers,
  Search,
  CheckCircle2,
  Building2,
  Flame,
  Sun,
  Coffee,
  Moon,
  Crown,
  Medal,
  Award,
  BarChart3,
  LineChart,
  Percent,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/ui/search-bar";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { buildReportHtml, buildTableSectionHtml, downloadCsv, openPrintWindow } from "@/modules/reports/report-export";

const HORIZON_TABS = [
  { key: "daily", labelKey: "reports.today", fallback: "Today", updates: { view: "daily", breakdown: "" } },
  { key: "shift", labelKey: "reports.shift", fallback: "Shift Wise", updates: { view: "shift", breakdown: "" } },
  { key: "weekly", labelKey: "reports.weekly", fallback: "Last 7 Days", updates: { view: "weekly", breakdown: "" } },
  { key: "accumulated", labelKey: "reports.allTime", fallback: "All Time", updates: { view: "accumulated", breakdown: "category" } }
];

/* -------------------------------------------------------------
 * 1. Mini SVG Sparkline for Stat Cards
 * ------------------------------------------------------------- */
function MiniSparkline({ data = [], color = "#2771cb", height = 36, width = 100, isUp = true }) {
  const pointsData = data && data.length >= 2
    ? data
    : isUp
    ? [10, 14, 12, 18, 16, 24, 30]
    : [30, 26, 28, 20, 22, 16, 12];

  const max = Math.max(...pointsData, 1);
  const min = Math.min(...pointsData, 0);
  const range = max - min || 1;
  const stepX = width / (pointsData.length - 1);

  const coords = pointsData.map((val, idx) => {
    const x = idx * stepX;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const lineD = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${width},${height} L0,${height} Z`;
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).substr(2, 6)}`;

  return (
    <svg width={width} height={height} className="overflow-visible select-none shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------
 * 2. Radial Circular Gauge (e.g. for Repeat Rate / AOV Target)
 * ------------------------------------------------------------- */
function RadialGauge({ value = 0, max = 100, size = 52, strokeWidth = 5.5, color = "#2771cb", label = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / (max || 100)) * 100));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-black text-slate-800 tabular-nums">
        {label || `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. Interactive Donut Chart (Pure SVG)
 * ------------------------------------------------------------- */
function DonutChart({
  items = [],
  size = 190,
  strokeWidth = 26,
  centerTitle = "",
  centerSubtitle = "",
  onHoverItem = null
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f8fafc" strokeWidth={strokeWidth} fill="transparent" />
        {items.map((item, idx) => {
          const value = Number(item.value) || 0;
          if (value <= 0 || total <= 0) return null;
          const pct = (value / total) * 100;
          const strokeDash = (pct / 100) * circumference;
          const strokeOffset = -((accumulatedPercent / 100) * circumference);
          accumulatedPercent += pct;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeDashoffset={strokeOffset}
              fill="transparent"
              onMouseEnter={() => onHoverItem && onHoverItem(item)}
              onMouseLeave={() => onHoverItem && onHoverItem(null)}
              className="transition-all duration-200 hover:stroke-[30px] cursor-pointer"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[110px]">
          {centerSubtitle}
        </span>
        <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight tabular-nums truncate max-w-[125px]">
          {centerTitle}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. Executive Stat Card with Sparklines / Visual Meters
 * ------------------------------------------------------------- */
function StatCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  tone = "default",
  sparkColor = "#2771cb",
  sparkData = [],
  gauge = null
}) {
  const safeDelta = delta || { value: 0, label: "" };
  const isPositive = safeDelta.value >= 0;

  const toneStyles = {
    hero: "bg-gradient-to-br from-[#f0f7ff] via-white to-[#e8f2ff] border-[#cbe3ff] text-slate-900 shadow-sm",
    default: "bg-white border-slate-200/80 text-slate-900 shadow-xs",
    warning: "bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-amber-200/80 text-amber-950 shadow-xs",
    success: "bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 border-emerald-200/80 text-emerald-950 shadow-xs",
    purple: "bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40 border-purple-200/80 text-purple-950 shadow-xs"
  };

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${toneStyles[tone] || toneStyles.default}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
          {subtitle && <div className="mt-0.5 text-xs text-slate-500 font-medium">{subtitle}</div>}
        </div>

        {gauge ? (
          <div className="pt-1">{gauge}</div>
        ) : Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-700 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
        {safeDelta.label ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isPositive ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-[#13508b]"
            }`}
          >
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {safeDelta.label}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Tracking period</span>
        )}

        <MiniSparkline data={sparkData} color={sparkColor} isUp={isPositive} width={90} height={32} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * Helper: Path Math for Trend Charts
 * ------------------------------------------------------------- */
function buildAreaPath(values, width, height) {
  if (!values || !values.length) return { lineD: "", areaD: "", points: [] };
  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  const points = values.map((val, idx) => {
    const x = idx * stepX;
    const y = height - ((val / max) * (height - 30)) - 15;
    return { x, y, val };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${width},${height} L0,${height} Z`;
  return { lineD, areaD, points };
}

export function SalesReportClient({ report }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const isBangla = i18n.language === "bn";

  const [trendMode, setTrendMode] = useState("revenue"); // "revenue" | "orders"
  const [chartType, setChartType] = useState("area"); // "area" | "bar"
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [hoveredMeal, setHoveredMeal] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [transactionSearch, setTransactionSearch] = useState("");

  const activeView = report.reportView || "daily";

  function updateFilters(nextValues) {
    const params = new URLSearchParams();
    const merged = { ...report.filters, ...nextValues };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  // Active chart data
  const chartLabels = report.salesBreakdown?.labels || [];
  const chartValues = trendMode === "revenue"
    ? (report.salesBreakdown?.values || [])
    : (report.salesBreakdown?.orderCounts || []);

  const totalChartVal = chartValues.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const avgChartVal = chartValues.length > 0 ? totalChartVal / chartValues.length : 0;
  const maxChartVal = Math.max(...chartValues, 1);

  const chartWidth = 720;
  const chartHeight = 230;
  const { lineD, areaD, points } = useMemo(
    () => buildAreaPath(chartValues, chartWidth, chartHeight),
    [chartValues]
  );

  // 24-hour heatmap activity
  const hourlyData = useMemo(() => {
    const act = report.hourlyActivity || report.salesBreakdown;
    const vals = act?.values || [];
    const orders = act?.orderCounts || [];
    const maxVal = Math.max(...vals, 1);

    return Array.from({ length: 24 }, (_, h) => {
      const revenue = Number(vals[h] || 0);
      const orderCount = Number(orders[h] || 0);
      const pctOfMax = maxVal > 0 ? (revenue / maxVal) * 100 : 0;
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? "PM" : "AM";
      const shortLabel = `${h12}${ampm[0]}`;
      const fullLabel = `${String(h).padStart(2, "0")}:00 - ${String((h + 1) % 24).padStart(2, "0")}:00`;

      return {
        hour: h,
        shortLabel,
        fullLabel,
        revenue,
        orderCount,
        pctOfMax
      };
    });
  }, [report.hourlyActivity, report.salesBreakdown]);

  // Meal donut items
  const mealDonutItems = useMemo(() => {
    return (report.mealPeriods || []).map((m) => ({
      key: m.key,
      name: isBangla ? m.labelBn : m.labelEn,
      value: m.revenue,
      orders: m.orders,
      sharePct: m.sharePct,
      color: m.color
    }));
  }, [report.mealPeriods, isBangla]);

  const totalMealRevenue = useMemo(
    () => mealDonutItems.reduce((acc, m) => acc + m.value, 0),
    [mealDonutItems]
  );

  // Category donut items
  const categoryDonutItems = useMemo(() => {
    return (report.categoryDistribution || []).slice(0, 6).map((c) => ({
      key: c.nameEn,
      name: isBangla && c.nameBn ? c.nameBn : c.nameEn,
      value: c.revenue,
      units: c.units,
      sharePct: c.sharePct,
      color: c.color
    }));
  }, [report.categoryDistribution, isBangla]);

  // Filtered transactions
  const filteredRecentOrders = useMemo(() => {
    const list = report.recentOrders || [];
    if (!transactionSearch.trim()) return list;
    const q = transactionSearch.toLowerCase();
    return list.filter(
      (o) =>
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.customerPhone && o.customerPhone.includes(q))
    );
  }, [report.recentOrders, transactionSearch]);

  // Exports
  function handleExportCsv() {
    const rows = [
      ["BPC POS - Executive Sales & Visual Analytics Report"],
      [`Period: ${report.title}`, `Scope: ${report.scopeMode}`, `Generated: ${new Date().toLocaleString()}`],
      [],
      ["Financial Overview"],
      ["Metric", "Value"],
      ["Gross Revenue", formatCurrency(report.summary.totalSales)],
      ["Net Sales (After Refunds)", formatCurrency(report.summary.netSales)],
      ["Total Refunds", formatCurrency(report.summary.totalRefunds)],
      ["VAT / Tax Collected", formatCurrency(report.summary.totalVat)],
      ["Average Order Value (AOV)", formatCurrency(report.summary.averageOrderValue)],
      ["Total Orders", String(report.summary.totalOrders)],
      ["Products Sold", String(report.summary.productsSold)],
      ["New Guests", String(report.summary.newCustomers)],
      ["Customer Retention Rate", `${report.summary.repeatCustomerRate || 0}%`],
      [],
      ["Meal Period Intelligence"],
      ["Window", "Revenue", "Orders", "Share %"],
      ...(report.mealPeriods || []).map((m) => [m.labelEn, formatCurrency(m.revenue), String(m.orders), `${m.sharePct}%`]),
      [],
      ["Category Breakdown"],
      ["Category", "Revenue", "Units Sold", "Share %"],
      ...(report.categoryDistribution || []).map((c) => [c.nameEn, formatCurrency(c.revenue), String(c.units), `${c.sharePct}%`])
    ];
    downloadCsv(`bpc-sales-analytics-${activeView}.csv`, rows);
  }

  function handleExportPdf() {
    const summaryRows = [
      ["Gross Revenue", formatCurrency(report.summary.totalSales)],
      ["Net Sales (After Refunds)", formatCurrency(report.summary.netSales)],
      ["Total Refunds", formatCurrency(report.summary.totalRefunds)],
      ["VAT / Tax Collected", formatCurrency(report.summary.totalVat)],
      ["Average Order Value (AOV)", formatCurrency(report.summary.averageOrderValue)],
      ["Total Orders", String(report.summary.totalOrders)],
      ["Products Sold", String(report.summary.productsSold)],
      ["Customer Retention Rate", `${report.summary.repeatCustomerRate || 0}%`]
    ];
    const mealRows = (report.mealPeriods || []).map((m) => [m.labelEn, m.timeWindow, formatCurrency(m.revenue), String(m.orders), `${m.sharePct}%`]);
    const catRows = (report.categoryDistribution || []).map((c) => [c.nameEn, formatCurrency(c.revenue), String(c.units), `${c.sharePct}%`]);

    const html = buildReportHtml({
      title: "BPC POS - Executive Sales & Visual Analytics Report",
      subtitle: report.subtitle,
      metaLines: [
        `Generated: ${new Date().toLocaleString()}`,
        `Scope: ${report.scopeMode === "all-stores" ? "All Stores" : "Active Store"}`,
        `View: ${activeView.toUpperCase()}`
      ],
      sections: [
        buildTableSectionHtml({ title: "Financial Overview", columns: ["Metric", "Amount"], rows: summaryRows }),
        buildTableSectionHtml({ title: "Meal Periods Breakdown", columns: ["Period", "Time", "Revenue", "Orders", "Share"], rows: mealRows }),
        buildTableSectionHtml({ title: "Category Performance", columns: ["Category", "Revenue", "Units", "Share"], rows: catRows })
      ]
    });
    openPrintWindow({ title: "Sales Report", html });
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* 1. Universal Top Header & Horizon Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[26px] font-bold text-slate-900">
              {t("reports.title", { defaultValue: "Sales Report & Analytics" })}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-bold text-[#2771cb]">
              <Sparkles className="h-3 w-3" />
              Live Visuals
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {t("reports.subtitle", { defaultValue: "Executive visual dashboard, trading heatmaps, and meal period intelligence." })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Horizon Segmented Control */}
          <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white p-1 shadow-2xs">
            {HORIZON_TABS.map((tab) => {
              const isActive = activeView === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => updateFilters(tab.updates)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#2771cb] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {t(tab.labelKey, { defaultValue: tab.fallback })}
                </button>
              );
            })}
          </div>

          {/* Breakdown Select for Accumulated View */}
          {activeView === "accumulated" && report.filters?.breakdownOptions?.length > 0 ? (
            <select
              value={report.filters.breakdown}
              onChange={(e) => updateFilters({ breakdown: e.target.value })}
              className="h-10 rounded-2xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 outline-none shadow-2xs hover:border-slate-300 focus:border-[#2771cb]"
            >
              {report.filters.breakdownOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "category" ? "Category Breakdown" : opt === "subcategory" ? "Item Breakdown" : opt === "store" ? "Store Breakdown" : "Daily Breakdown"}
                </option>
              ))}
            </select>
          ) : null}

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
              title="Export as CSV spreadsheet"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>{t("reports.exportCsv", { defaultValue: "CSV" })}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-black transition"
              title="Print or export as PDF report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t("reports.exportPdf", { defaultValue: "Print / PDF" })}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Visual KPI Cards Grid with Sparklines & Radial Gauges */}
      <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard
          title={t("reports.grossRevenue", { defaultValue: "Gross Revenue" })}
          value={formatCurrency(report.summary.totalSales)}
          subtitle="Total customer billings"
          delta={report.summary.deltas?.totalSales}
          icon={TrendingUp}
          tone="hero"
          sparkColor="#2771cb"
          sparkData={chartValues.slice(0, 7)}
        />
        <StatCard
          title={t("reports.netRevenue", { defaultValue: "Net Sales" })}
          value={formatCurrency(report.summary.netSales)}
          subtitle="Revenue after refunds"
          delta={report.summary.deltas?.netSales}
          icon={Receipt}
          tone="success"
          sparkColor="#10b981"
          sparkData={chartValues.slice(0, 7)}
        />
        <StatCard
          title={t("reports.aov", { defaultValue: "Avg Order Value (AOV)" })}
          value={formatCurrency(report.summary.averageOrderValue)}
          subtitle="Basket size per customer"
          delta={report.summary.deltas?.averageOrderValue}
          icon={ShoppingBag}
          sparkColor="#8b5cf6"
          sparkData={[240, 310, 280, 420, 390, 460, report.summary.averageOrderValue || 350]}
        />
        <StatCard
          title={t("reports.totalOrders", { defaultValue: "Completed Orders" })}
          value={String(report.summary.totalOrders)}
          subtitle="Processed POS tickets"
          delta={report.summary.deltas?.totalOrders}
          icon={CheckCircle2}
          sparkColor="#06b6d4"
          sparkData={report.salesBreakdown?.orderCounts?.slice(0, 7) || []}
        />
        <StatCard
          title={t("reports.productsSold", { defaultValue: "Products Sold" })}
          value={String(report.summary.productsSold)}
          subtitle="Dish units prepared"
          delta={report.summary.deltas?.productsSold}
          icon={UtensilsCrossed}
          sparkColor="#f59e0b"
          sparkData={[15, 28, 22, 35, 42, 38, report.summary.productsSold || 45]}
        />
        <StatCard
          title="Customer Retention"
          value={`${report.summary.repeatCustomerRate || 0}%`}
          subtitle="Returning customer share"
          gauge={
            <RadialGauge
              value={report.summary.repeatCustomerRate || 0}
              max={100}
              size={52}
              color="#7c3aed"
              label={`${report.summary.repeatCustomerRate || 0}%`}
            />
          }
          tone="purple"
          sparkColor="#7c3aed"
        />
        <StatCard
          title={t("reports.vatCollected", { defaultValue: "VAT / Tax Collected" })}
          value={formatCurrency(report.summary.totalVat)}
          subtitle="Government tax portion"
          icon={Layers}
          sparkColor="#64748b"
          sparkData={[50, 85, 70, 110, 95, 140, report.summary.totalVat || 120]}
        />
        <StatCard
          title={t("reports.refunds", { defaultValue: "Total Refunds" })}
          value={formatCurrency(report.summary.totalRefunds)}
          subtitle="Returns processed"
          delta={report.summary.deltas?.totalRefunds}
          icon={RotateCcw}
          tone="warning"
          sparkColor="#f59e0b"
          sparkData={[0, 0, 50, 0, 120, 0, report.summary.totalRefunds || 0]}
        />
      </div>

      {/* 3. Main Interactive Trends Chart with Curve / Bar View & Peak Highlight */}
      <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {t("reports.revenueTrends", { defaultValue: "Trading Dynamics & Volume Velocity" })}
              </h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {activeView.toUpperCase()}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeView === "daily"
                ? "Live hourly run-rate across the 24-hour trading timeline"
                : activeView === "weekly"
                ? "Daily progression across the last 7 calendar days"
                : "Aggregated chronological timeline"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTrendMode("revenue")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  trendMode === "revenue" ? "bg-white text-[#2771cb] shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("reports.revenueMode", { defaultValue: "Revenue (৳)" })}
              </button>
              <button
                type="button"
                onClick={() => setTrendMode("orders")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  trendMode === "orders" ? "bg-white text-[#2771cb] shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("reports.volumeMode", { defaultValue: "Orders" })}
              </button>
            </div>

            {/* Chart Type Toggle: Spline Area vs Rounded Bars */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setChartType("area")}
                title="Spline Area Curve"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chartType === "area" ? "bg-white text-[#2771cb] shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LineChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Curve</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                title="Rounded Gradient Bars"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  chartType === "bar" ? "bg-white text-[#2771cb] shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bars</span>
              </button>
            </div>
          </div>
        </div>

        {/* Peak Rush Hour Spotlight Banner */}
        {report.peakHour ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-purple-50/40 p-3.5 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2771cb] text-white shadow-xs">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isBangla ? "সর্বোচ্চ বিক্রয়ের সময়" : "Busiest Peak Trading Window"}
                </span>
                <div className="text-sm font-black text-slate-900">
                  {report.peakHour.windowLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Peak Volume</div>
                <div className="text-sm font-black text-[#2771cb] tabular-nums">
                  {formatCurrency(report.peakHour.revenue)} ({report.peakHour.orders} {isBangla ? "অর্ডার" : "orders"})
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Optimal Rush
              </span>
            </div>
          </div>
        ) : null}

        {/* Interactive Chart Canvas (Pure SVG) */}
        <div className="mt-6 min-w-0 overflow-x-auto">
          {chartValues.length > 0 ? (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="h-[250px] min-w-[550px] w-full select-none">
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2771cb" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#2771cb" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#2771cb" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2771cb" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.65" />
                </linearGradient>
                <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#13508b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#2771cb" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />
              <line x1="0" y1={chartHeight * 0.66} x2={chartWidth} y2={chartHeight * 0.66} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="0" y1={chartHeight * 0.33} x2={chartWidth} y2={chartHeight * 0.33} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />

              {/* Area View */}
              {chartType === "area" && (
                <>
                  <path d={areaD} fill="url(#chartAreaGradient)" />
                  <path d={lineD} fill="none" stroke="#2771cb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, idx) => {
                    const isHov = hoveredPointIndex === idx;
                    return (
                      <g key={idx} onMouseEnter={() => setHoveredPointIndex(idx)} onMouseLeave={() => setHoveredPointIndex(null)} className="cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHov ? 7 : 4}
                          fill={isHov ? "#2771cb" : "#ffffff"}
                          stroke="#2771cb"
                          strokeWidth="2.5"
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* Bar View */}
              {chartType === "bar" && (
                <g>
                  {chartValues.map((val, idx) => {
                    const barCount = chartValues.length;
                    const availableWidth = chartWidth / barCount;
                    const barWidth = Math.max(8, Math.min(28, availableWidth * 0.6));
                    const x = (idx * availableWidth) + (availableWidth - barWidth) / 2;
                    const barHeight = maxChartVal > 0 ? (val / maxChartVal) * (chartHeight - 35) : 0;
                    const y = chartHeight - barHeight;
                    const isHov = hoveredPointIndex === idx;

                    return (
                      <g key={idx} onMouseEnter={() => setHoveredPointIndex(idx)} onMouseLeave={() => setHoveredPointIndex(null)} className="cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(4, barHeight)}
                          rx="4"
                          fill={isHov ? "url(#barHoverGradient)" : "url(#barGradient)"}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Tooltip Overlay */}
              {hoveredPointIndex !== null && chartValues[hoveredPointIndex] !== undefined && (
                <g pointerEvents="none">
                  {(() => {
                    const idx = hoveredPointIndex;
                    const val = chartValues[idx];
                    const label = chartLabels[idx] || "";
                    const step = chartWidth / (chartValues.length - 1 || 1);
                    const posX = Math.max(70, Math.min(chartWidth - 70, idx * step));
                    const posY = chartType === "area" ? (points[idx]?.y || 40) - 45 : 30;

                    return (
                      <g>
                        <rect
                          x={posX - 65}
                          y={Math.max(10, posY)}
                          width="130"
                          height="44"
                          rx="10"
                          fill="#0f172a"
                          opacity="0.94"
                          className="shadow-xl"
                        />
                        <text x={posX} y={Math.max(10, posY) + 17} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                          {label}
                        </text>
                        <text x={posX} y={Math.max(10, posY) + 33} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                          {trendMode === "revenue" ? formatCurrency(val) : `${val} orders`}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* X Axis Labels */}
              {chartLabels.map((lbl, idx) => {
                if (chartLabels.length > 12 && idx % 2 !== 0 && idx !== chartLabels.length - 1) return null;
                const x = chartLabels.length === 1 ? chartWidth / 2 : (idx * chartWidth) / (chartLabels.length - 1);
                return (
                  <text key={idx} x={x} y={chartHeight + 24} textAnchor="middle" className="fill-slate-400 text-[11px] font-semibold">
                    {lbl}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">No trading activity recorded for this period.</div>
          )}
        </div>

        {/* Mini Summary Statistics Pill Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#2771cb]" />
            <span>Average Run-Rate: <strong className="text-slate-900 font-bold">{trendMode === "revenue" ? formatCurrency(avgChartVal) : `${Math.round(avgChartVal)} orders`}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Peak Activity: <strong className="text-slate-900 font-bold">{trendMode === "revenue" ? formatCurrency(maxChartVal) : `${maxChartVal} orders`}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-purple-500" />
            <span>Total Period Tally: <strong className="text-slate-900 font-bold">{trendMode === "revenue" ? formatCurrency(totalChartVal) : `${totalChartVal} orders`}</strong></span>
          </div>
        </div>
      </Card>

      {/* 4. 24-Hour Trading Velocity Heatmap Strip */}
      <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#2771cb]" />
              24-Hour Trading Heatmap Matrix
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Visual activity density distribution across every hour of the operational day.
            </p>
          </div>

          {/* Heatmap Intensity Legend */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>Low</span>
            <span className="h-3 w-3 rounded-md bg-slate-100 border border-slate-200" />
            <span className="h-3 w-3 rounded-md bg-blue-100" />
            <span className="h-3 w-3 rounded-md bg-blue-300" />
            <span className="h-3 w-3 rounded-md bg-[#2771cb]" />
            <span className="h-3 w-3 rounded-md bg-[#13508b]" />
            <span>High Rush</span>
          </div>
        </div>

        {/* 24 Hourly Cells */}
        <div className="mt-4 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-24 gap-1.5 select-none">
          {hourlyData.map((h) => {
            let bgClass = "bg-slate-100 text-slate-500 border border-slate-200/60";
            if (h.pctOfMax > 75) {
              bgClass = "bg-gradient-to-t from-[#13508b] to-[#2771cb] text-white shadow-xs font-bold ring-2 ring-[#2771cb]/20";
            } else if (h.pctOfMax > 45) {
              bgClass = "bg-blue-400 text-white font-bold";
            } else if (h.pctOfMax > 20) {
              bgClass = "bg-blue-200 text-blue-950 font-semibold";
            } else if (h.revenue > 0) {
              bgClass = "bg-blue-100 text-blue-900 font-semibold";
            }

            const isHover = hoveredHour?.hour === h.hour;

            return (
              <div
                key={h.hour}
                onMouseEnter={() => setHoveredHour(h)}
                onMouseLeave={() => setHoveredHour(null)}
                className={`relative flex flex-col items-center justify-between rounded-xl p-2 h-20 transition-all duration-150 cursor-pointer hover:scale-105 hover:z-10 ${bgClass}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-tight opacity-80">{h.shortLabel}</span>
                <span className="text-[11px] font-black tabular-nums">{h.orderCount > 0 ? h.orderCount : "–"}</span>
                <span className="text-[9px] font-bold truncate max-w-full opacity-90">{h.revenue > 0 ? `৳${Math.round(h.revenue)}` : ""}</span>

                {/* Floating Tooltip */}
                {isHover && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 min-w-[130px] rounded-xl bg-slate-900 px-3 py-2 text-center text-white shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{h.fullLabel}</div>
                    <div className="text-xs font-black text-white mt-0.5">{formatCurrency(h.revenue)}</div>
                    <div className="text-[10px] text-blue-300 font-medium">{h.orderCount} orders</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. Meal Period Intelligence with Interactive Donut Chart */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Meal Periods Donut & Visual Cards */}
        <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t("reports.mealAnalytics", { defaultValue: "Meal Period Intelligence" })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Visual sales contribution by operational meal windows.
              </p>
            </div>
            <UtensilsCrossed className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-6 flex flex-col md:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="shrink-0 flex flex-col items-center">
              <DonutChart
                items={mealDonutItems}
                size={190}
                strokeWidth={26}
                centerTitle={hoveredMeal ? formatCurrency(hoveredMeal.value) : formatCurrency(totalMealRevenue)}
                centerSubtitle={hoveredMeal ? hoveredMeal.name : "Total Meals"}
                onHoverItem={(item) => setHoveredMeal(item)}
              />
              <span className="mt-2 text-[11px] text-slate-400 font-medium">Hover slices to inspect</span>
            </div>

            {/* Meal Cards Matrix */}
            <div className="flex-1 w-full space-y-2.5">
              {(report.mealPeriods || []).map((m) => {
                const isHover = hoveredMeal?.key === m.key;
                const IconComponent = m.key === "breakfast" ? Sun : m.key === "lunch" ? UtensilsCrossed : m.key === "snacks" ? Coffee : Moon;

                return (
                  <div
                    key={m.key}
                    onMouseEnter={() => setHoveredMeal({ key: m.key, name: isBangla ? m.labelBn : m.labelEn, value: m.revenue })}
                    onMouseLeave={() => setHoveredMeal(null)}
                    className={`flex items-center justify-between rounded-2xl border p-3 transition-all duration-150 cursor-pointer ${
                      isHover
                        ? "border-[#2771cb] bg-blue-50/70 shadow-xs scale-[1.02]"
                        : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {isBangla ? m.labelBn : m.labelEn}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">{m.timeWindow}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(m.revenue)}</div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500 font-medium">{m.orders} orders</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.sharePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Category Contribution Donut & Meters */}
        <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t("reports.categoryDistribution", { defaultValue: "Category Revenue Share" })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Contribution breakdown by kitchen dish category.
              </p>
            </div>
            <Layers className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 space-y-3.5">
            {categoryDonutItems.map((cat) => (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium text-[11px]">{cat.units} items</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(cat.value)}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {cat.sharePct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.sharePct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}

            {categoryDonutItems.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">No category sales in this period.</div>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Top Selling Dishes Leaderboard with Podium Medals */}
      <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              {t("reports.topItems", { defaultValue: "Top Performing Menu Items" })}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Ranked items driving maximum revenue volume and kitchen throughput.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-bold text-amber-800">
            Ranked by Revenue
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(report.topProducts || []).slice(0, 6).map((item) => {
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;
            const isThird = item.rank === 3;

            let rankBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
            if (isFirst) rankBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/30 font-black";
            else if (isSecond) rankBadgeClass = "bg-slate-200 text-slate-800 border-slate-300 font-bold";
            else if (isThird) rankBadgeClass = "bg-orange-100 text-orange-900 border-orange-200 font-bold";

            return (
              <div
                key={item.name}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 hover:shadow-md ${
                  isFirst ? "border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10" : "border-slate-200/80 bg-slate-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs ${rankBadgeClass}`}>
                      {isFirst ? <Crown className="h-3.5 w-3.5" /> : item.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">
                        {isBangla && item.nameBn ? item.nameBn : item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{item.quantity} units sold</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-[#2771cb] tabular-nums">{formatCurrency(item.sales)}</div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2771cb]">
                      {item.salesPct}% sales
                    </span>
                  </div>
                </div>

                {/* Popularity Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-medium">
                    <span>Popularity share</span>
                    <span>{item.popularityPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.popularityPct}%`, backgroundColor: item.color || "#2771cb" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {(!report.topProducts || report.topProducts.length === 0) && (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">No item sales recorded.</div>
          )}
        </div>
      </Card>

      {/* 7. Branch Performance Leaderboard (Super Admin All Stores) */}
      {report.scopeMode === "all-stores" && report.storeLeaderboard?.length > 0 ? (
        <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-slate-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t("reports.storeShare", { defaultValue: "Branch Performance Leaderboard" })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Cross-store revenue & orders breakdown.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.storeLeaderboard.map((st) => (
              <div key={st.storeName} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 hover:shadow-sm transition">
                <div className="text-xs font-bold text-slate-800">{st.storeName}</div>
                <div className="mt-2 text-xl font-black text-slate-900 tabular-nums">{formatCurrency(st.revenue)}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{st.orders} orders</span>
                  <span className="font-bold text-[#2771cb]">{st.sharePct}% share</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* 8. Recent Orders Transactions Ledger */}
      <Card className="min-w-0 p-6 rounded-[26px] border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t("reports.recentTransactions", { defaultValue: "Recent Order Transactions" })}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("reports.recentSubtitle", { defaultValue: "Latest orders captured in this period." })}
            </p>
          </div>

          {/* Table Search Input */}
          <div className="w-full sm:w-64">
            <SearchBar
              value={transactionSearch}
              onChange={(val) => setTransactionSearch(val)}
              placeholder="Filter by invoice or guest..."
              className="h-10 rounded-xl px-3 text-xs bg-slate-50/70"
              inputClassName="text-xs"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Invoice</th>
                <th className="pb-3 pr-4">Guest</th>
                <th className="pb-3 pr-4">Items Summary</th>
                <th className="pb-3 pr-4">Timestamp</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pr-4 font-mono font-bold text-[#2771cb]">
                    #{order.invoiceNumber}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-800">{order.customerName}</div>
                    {order.customerPhone && <div className="text-[11px] text-slate-400">{order.customerPhone}</div>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    <span className="font-semibold text-slate-800">{order.itemsCount} items</span>
                    <span className="text-slate-400"> • {order.firstItemName}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{" "}
                    {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        order.status === "PAID" || order.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-amber-50 text-amber-700 border border-amber-200/60"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900 tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              ))}

              {filteredRecentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No matching order transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
