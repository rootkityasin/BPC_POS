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

function AddExpenseModal({ isOpen, onClose, data }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addExpense, INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.status]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-xl" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">Add Expense</h3>
      <p className="mt-2 text-sm text-slate-500">Record what the cost was for and how much it cost.</p>
      <form action={formAction} className="mt-6 space-y-4">
        {data.scopeMode === "all-stores" ? (
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Store</span>
            <select name="storeId" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <option value="">Select store</option>
              {data.stores.map((store) => <option key={store.id} value={store.id}>{store.nameEn}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Expense Type</span>
          <select name="type" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <option value="">Select expense type</option>
            {data.expenseTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Expense Title</span>
          <input name="title" type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Electricity bill" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Amount</span>
            <input name="amount" type="number" min="0" step="0.01" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="0.00" />
          </label>
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Expense Date</span>
            <input name="incurredOn" type="date" defaultValue={data.filters.to} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
        </div>
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">Note</span>
          <textarea name="note" rows="4" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Optional note about this expense" />
        </label>
        {state.status === "error" ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{state.message}</div> : null}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <Button type="submit" className="flex-1 rounded-2xl py-3" disabled={pending}>{pending ? "Saving..." : "Save Expense"}</Button>
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
            <h2 className="text-2xl font-black text-slate-900">Expense Tracking</h2>
            <p className="text-sm text-slate-500">Track operational costs by expense type and store.</p>
          </div>
          {canManage ? (
            <Button type="button" className="rounded-2xl" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          ) : null}
        </div>

        <Card className="p-5">
          <div className="grid gap-4 xl:grid-cols-[180px_180px_minmax(0,1fr)]">
            <input type="date" value={data.filters.from} onChange={(event) => updateFilters({ from: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
            <input type="date" value={data.filters.to} onChange={(event) => updateFilters({ to: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />
            <select value={data.filters.type} onChange={(event) => updateFilters({ type: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="">All expense types</option>
              {data.expenseTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total Expense" value={formatCurrency(data.summary.totalAmount)} hint="Total spend in the selected period." />
          <SummaryCard label="Entries" value={String(data.summary.totalEntries)} hint="Expense records captured for this filter set." />
          <SummaryCard label="Top Type" value={topTypes[0]?.label || "No data"} hint={topTypes[0] ? formatCurrency(topTypes[0].total) : "No expense type totals available yet."} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="text-lg font-bold text-slate-900">Expense Types</div>
            <div className="mt-5 space-y-4">
              {data.summary.groupedByType.length === 0 ? <div className="text-sm text-slate-500">No expenses in the selected period.</div> : null}
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
              <div>Expense</div>
              <div>Type</div>
              <div>Store</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-100">
              {data.expenses.length === 0 ? <div className="px-6 py-10 text-center text-sm text-slate-500">No expenses found for the selected filters.</div> : null}
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
