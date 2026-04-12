"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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

  const chartSeries = useMemo(
    () => [{ label: report.filters.breakdown, color: "#2771cb", values: report.salesBreakdown.values }],
    [report.filters.breakdown, report.salesBreakdown.values]
  );

  function updateFilters(nextValues) {
    const params = new URLSearchParams();
    const merged = { ...report.filters, ...nextValues };

    Object.entries(merged).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
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
          <select value={report.filters.range} onChange={(event) => updateFilters({ range: event.target.value })} className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
          {report.filters.range === "custom" ? (
            <>
              <input type="date" value={report.filters.from} onChange={(event) => updateFilters({ range: "custom", from: event.target.value })} className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
              <input type="date" value={report.filters.to} onChange={(event) => updateFilters({ range: "custom", to: event.target.value })} className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
            </>
          ) : null}
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
        <Card className="min-w-0 p-6 overflow-hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">Sales Breakdown</div>
              <div className="mt-1 text-sm text-slate-500">
                {report.scopeMode === "all-stores" ? "Cross-store breakdown for super admin overview." : "Store-level sales breakdown based on dish-related groupings."}
              </div>
            </div>
            <select value={report.filters.breakdown} onChange={(event) => updateFilters({ breakdown: event.target.value })} className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
              {report.filters.breakdownOptions.map((option) => (
                <option key={option} value={option}>{option[0].toUpperCase()}{option.slice(1)}</option>
              ))}
            </select>
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
