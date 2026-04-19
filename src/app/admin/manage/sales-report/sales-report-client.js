"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Download, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const FILTER_OPTIONS = [
  { key: "category", label: "Category", updates: { view: "accumulated", breakdown: "category" } },
  { key: "item", label: "Item", updates: { view: "accumulated", breakdown: "subcategory" } },
  { key: "daily", label: "Daily", updates: { view: "daily", breakdown: "" } },
  { key: "weekly", label: "Weekly", updates: { view: "weekly", breakdown: "" } },
  { key: "accumulated", label: "Accumulated", updates: { view: "accumulated", breakdown: "category" } },
  { key: "shift", label: "Shift wise", updates: { view: "shift", breakdown: "" } }
];

function getViewTitle(view) {
  switch (view) {
    case "accumulated":
      return "Accumulated Sales";
    case "shift":
      return "Shift Wise Sell";
    case "weekly":
      return "Weekly Sell";
    default:
      return "Daily Sell";
  }
}

function getViewSubtitle(view, scopeMode) {
  const prefix = scopeMode === "all-stores" ? "Cross-store" : "Store-level";

  switch (view) {
    case "accumulated":
      return `${prefix} all-time sales overview.`;
    case "shift":
      return `${prefix} sales grouped by shift.`;
    case "weekly":
      return `${prefix} sales grouped by day for the last 7 days.`;
    default:
      return `${prefix} sales grouped by hour for today.`;
  }
}

function formatBreakdownLabel(option) {
  switch (option) {
    case "category":
      return "Category";
    case "subcategory":
      return "Subcategory";
    case "day":
      return "Day";
    case "store":
      return "Store";
    case "others":
      return "Others Sell";
    default:
      return option;
  }
}

function getActiveFilterKey(report) {
  if (report.reportView === "daily") return "daily";
  if (report.reportView === "weekly") return "weekly";
  if (report.reportView === "shift") return "shift";
  if (report.reportView === "accumulated" && report.filters.breakdown === "subcategory") return "item";
  return "category";
}

function buildLinePath(values, width, height) {
  if (!values.length) return "";

  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value / max) * height);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function StatCard({ title, value, delta, toneClass }) {
  const valueLength = String(value || "").length;
  const valueSizeClass = valueLength > 14
    ? "text-base sm:text-lg xl:text-xl"
    : valueLength > 10
      ? "text-lg sm:text-xl xl:text-2xl"
      : "text-xl sm:text-2xl xl:text-[26px]";

  return (
    <div className={`min-w-0 overflow-hidden rounded-[24px] p-5 ${toneClass}`}>
      <div className="truncate text-sm font-semibold text-slate-700">{title}</div>
      <div className={`mt-4 overflow-hidden text-ellipsis whitespace-nowrap font-black leading-tight tracking-[-0.02em] text-slate-900 ${valueSizeClass}`}>{value}</div>
      <div className={`mt-3 break-words text-xs font-medium leading-5 ${delta.value >= 0 ? "text-emerald-600" : "text-[#13508b]"}`}>{delta.label}</div>
    </div>
  );
}

function MultiLineChart({ labels, series }) {
  const width = 360;
  const height = 140;

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height + 24}`} className="h-[180px] min-w-[320px] w-full">
        {series.map((entry) => (
          <path key={entry.label} d={buildLinePath(entry.values, width, height)} fill="none" stroke={entry.color} strokeWidth="3" strokeLinecap="round" />
        ))}
        {labels.map((label, index) => {
          const x = labels.length === 1 ? 0 : (index * width) / (labels.length - 1);
          return <text key={label} x={x} y={height + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">{label}</text>;
        })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        {series.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function SingleLineChart({ labels, values }) {
  const width = 520;
  const height = 160;

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height + 30}`} className="h-[220px] min-w-[420px] w-full">
        <path d={buildLinePath(values, width, height)} fill="none" stroke="#2771cb" strokeWidth="3" strokeLinecap="round" />
        {labels.map((label, index) => {
          const x = labels.length === 1 ? 0 : (index * width) / (labels.length - 1);
          return <text key={label} x={x} y={height + 22} textAnchor="middle" className="fill-slate-400 text-[10px]">{label}</text>;
        })}
        </svg>
      </div>
    </div>
  );
}

export function SalesReportClient({ report }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  const filterButtonRef = useRef(null);

  const activeFilterKey = getActiveFilterKey(report);
  const activeFilterLabel = useMemo(
    () => FILTER_OPTIONS.find((option) => option.key === activeFilterKey)?.label || "Filter",
    [activeFilterKey]
  );

  useEffect(() => {
    function handlePointerDown(event) {
      if (!filterMenuRef.current && !filterButtonRef.current) return;
      if (filterMenuRef.current?.contains(event.target) || filterButtonRef.current?.contains(event.target)) return;
      setFilterMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setFilterMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updateFilters(nextValues) {
    const params = new URLSearchParams();
    const merged = { ...report.filters, ...nextValues };

    Object.entries(merged).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
    setFilterMenuOpen(false);
  }

  function handleExport() {
    const rows = [
      ["Metric", "Value"],
      ["Total Sales", report.summary.totalSales],
      ["Total Orders", report.summary.totalOrders],
      ["Products Sold", report.summary.productsSold],
      ["New Customers", report.summary.newCustomers],
      [],
      ["Top Products"],
      ["Rank", "Name", "Popularity %", "Sales %", "Sales Amount"],
      ...report.topProducts.map((item) => [item.rank, item.name, item.popularityPct, item.salesPct, item.sales])
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-900">{report.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{report.subtitle}</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 xl:w-auto xl:justify-end">
          <Button type="button" variant="outline" className="rounded-2xl" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <div className="relative" ref={filterMenuRef}>
            <button
              ref={filterButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={filterMenuOpen}
              onClick={() => setFilterMenuOpen((value) => !value)}
              className="flex min-w-[156px] items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-[14px] font-medium text-[#2771cb] shadow-[0_6px_20px_rgba(15,23,42,0.08)] ring-1 ring-transparent transition hover:bg-[#fffdfa] focus:outline-none focus:ring-[#f2dfcb]"
            >
              <span className="truncate">{activeFilterLabel}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${filterMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {filterMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[165px] rounded-[18px] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                {FILTER_OPTIONS.map((option) => {
                  const selected = option.key === activeFilterKey;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => updateFilters(option.updates)}
                      className={`block w-full rounded-[14px] px-3 py-2 text-left text-[14px] leading-5 transition ${selected ? "bg-[#fbeede] text-[#2771cb]" : "text-[#2771cb] hover:bg-[#f7f7f7]"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-6">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">General Overview</div>
              <div className="mt-1 text-sm text-slate-500">Sales summary for the selected report period.</div>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Sales" value={formatCurrency(report.summary.totalSales)} delta={report.summary.deltas.totalSales} toneClass="bg-[#e5f1ff]" />
            <StatCard title="Total Order" value={String(report.summary.totalOrders)} delta={report.summary.deltas.totalOrders} toneClass="bg-amber-50" />
            <StatCard title="Product Sold" value={String(report.summary.productsSold)} delta={report.summary.deltas.productsSold} toneClass="bg-emerald-50" />
            <StatCard title="New Customers" value={String(report.summary.newCustomers)} delta={report.summary.deltas.newCustomers} toneClass="bg-violet-50" />
          </div>
        </Card>

        <Card className="min-w-0 p-6 overflow-hidden">
          <div className="text-lg font-bold text-slate-900">Visitor Insights</div>
          <div className="mt-1 text-sm text-slate-500">Loyal, new, and unique customers across the selected period.</div>
          <div className="mt-5">
            <MultiLineChart labels={report.visitorInsights.labels} series={report.visitorInsights.series} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">{getViewTitle(report.reportView)}</div>
              <div className="mt-1 text-sm text-slate-500">{getViewSubtitle(report.reportView, report.scopeMode)}</div>
            </div>
            {report.filters.breakdownOptions.length > 0 ? (
              <select value={report.filters.breakdown} onChange={(event) => updateFilters({ breakdown: event.target.value })} className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                {report.filters.breakdownOptions.map((option) => (
                  <option key={option} value={option}>{formatBreakdownLabel(option)}</option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="mt-6">
            <SingleLineChart labels={report.salesBreakdown.labels} values={report.salesBreakdown.values} />
          </div>
        </Card>

        <Card className="min-w-0 p-6 overflow-hidden">
          <div className="text-lg font-bold text-slate-900">Top Dishes</div>
          <div className="mt-1 text-sm text-slate-500">Best-performing dishes and sellable items for the active report scope.</div>
          <div className="mt-6 space-y-5">
            {report.topProducts.map((item) => (
              <div key={item.name} className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_90px] items-center gap-4">
                <div className="text-sm font-semibold text-slate-400">{String(item.rank).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${item.popularityPct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
                <div className="justify-self-end rounded-full px-3 py-1 text-xs font-semibold" style={{ color: item.color, backgroundColor: `${item.color}14` }}>
                  {item.salesPct}%
                </div>
              </div>
            ))}
            {report.topProducts.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No sales found for the selected period.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
