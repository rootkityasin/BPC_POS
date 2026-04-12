"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { formatCurrency } from "@/lib/utils";
import { addExpense } from "./actions";

const INITIAL_STATE = { status: "idle", message: "" };

function SummaryCard({ label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-3 break-words text-3xl font-black text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 text-center">
      <div className="text-lg font-bold text-slate-900">No spending records yet</div>
      <div className="mt-2 text-sm text-slate-500">Start by adding the first expense for rent, salary, bills, supplies, or any daily cost.</div>
    </Card>
  );
}

function AddExpenseModal({ isOpen, onClose, data }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addExpense, INITIAL_STATE);
  const [selectedType, setSelectedType] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedType("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.status]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">Add a New Cost</h3>
      <p className="mt-2 text-sm text-slate-500">Choose what the money was spent on, then enter the amount and date.</p>
      <form action={formAction} className="mt-6 space-y-4">
        {data.scopeMode === "all-stores" ? (
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Which store is this for?</span>
            <select name="storeId" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <option value="">Choose a store</option>
              {data.stores.map((store) => <option key={store.id} value={store.id}>{store.nameEn}</option>)}
            </select>
          </label>
        ) : null}
        <div>
          <div className="mb-2 block text-sm font-medium text-slate-700">What was this cost for?</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.expenseTypes.map((type) => {
              const active = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="type" value={selectedType} />
        </div>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Short Name</span>
          <input name="title" type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Electricity bill for April" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">How much was spent?</span>
            <input name="amount" type="number" min="0" step="0.01" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="0.00" />
          </label>
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">When did it happen?</span>
            <input name="incurredOn" type="date" defaultValue={data.filters.to} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
        </div>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Extra Note</span>
          <textarea name="note" rows="4" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Optional details, such as vendor name or payment reason" />
        </label>
        {state.status === "error" ? <div className="rounded-2xl bg-[#e5f1ff] px-4 py-3 text-sm font-medium text-[#13508b]">{state.message}</div> : null}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <Button type="submit" className="flex-1 rounded-2xl py-3" disabled={pending}>{pending ? "Saving..." : "Save Cost"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ExpenseTrackingClient({ data, canManage }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const topTypes = useMemo(() => data.summary.groupedByType.slice(0, 4), [data.summary.groupedByType]);

  function updateFilters(nextValues) {
    const params = new URLSearchParams();
    const merged = { ...data.filters, ...nextValues };
    Object.entries(merged).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <AddExpenseModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} data={data} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Daily Spending</h2>
            <p className="text-sm text-slate-500">Keep a simple record of rent, bills, salaries, supplies, transport, and other costs.</p>
          </div>
          {canManage ? (
            <Button type="button" className="rounded-2xl" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost
            </Button>
          ) : null}
        </div>

        <Card className="p-5">
          <div className="mb-3 text-sm font-medium text-slate-700">Filter by date or cost type</div>
          <div className="grid gap-4 xl:grid-cols-[180px_180px_minmax(0,1fr)]">
            <input type="date" value={data.filters.from} onChange={(event) => updateFilters({ from: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" aria-label="From date" />
            <input type="date" value={data.filters.to} onChange={(event) => updateFilters({ to: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" aria-label="To date" />
            <select value={data.filters.type} onChange={(event) => updateFilters({ type: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="">All cost types</option>
              {data.expenseTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total Spent" value={formatCurrency(data.summary.totalAmount)} hint="Total money spent in the selected time range." />
          <SummaryCard label="Cost Entries" value={String(data.summary.totalEntries)} hint="How many spending records were added." />
          <SummaryCard label="Main Cost Type" value={topTypes[0]?.label || "No data yet"} hint={topTypes[0] ? `${formatCurrency(topTypes[0].total)} spent here` : "Add a few costs to see the biggest spending area."} />
        </div>

        {data.expenses.length === 0 ? <EmptyState /> : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="text-lg font-bold text-slate-900">Where the money went</div>
            <div className="mt-5 space-y-4">
              {data.summary.groupedByType.length === 0 ? <div className="text-sm text-slate-500">No costs in the selected date range.</div> : null}
              {data.summary.groupedByType.map((entry) => (
                <div key={entry.value} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{entry.label}</div>
                  </div>
                  <div className="text-sm font-bold text-slate-700">{formatCurrency(entry.total)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-[150px_minmax(0,1.2fr)_130px_140px_140px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <div>Date</div>
              <div>What Was Paid</div>
              <div>Cost Type</div>
              <div>Store</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-100">
              {data.expenses.length === 0 ? <div className="px-6 py-10 text-center text-sm text-slate-500">No costs found for the selected filters.</div> : null}
              {data.expenses.map((expense) => (
                <div key={expense.id} className="grid grid-cols-[150px_minmax(0,1.2fr)_130px_140px_140px] gap-4 px-6 py-5">
                  <div className="text-sm text-slate-600">{new Date(expense.incurredOn).toLocaleDateString()}</div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{expense.title}</div>
                    {expense.note ? <div className="mt-1 truncate text-sm text-slate-500">{expense.note}</div> : null}
                  </div>
                  <div className="text-sm text-slate-600">{data.expenseTypes.find((type) => type.value === expense.type)?.label || expense.type}</div>
                  <div className="text-sm text-slate-600">{expense.store?.nameEn || "Unknown store"}</div>
                  <div className="text-right text-sm font-bold text-slate-900">{formatCurrency(expense.amount)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
