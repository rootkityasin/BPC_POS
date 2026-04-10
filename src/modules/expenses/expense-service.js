import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export const EXPENSE_TYPE_OPTIONS = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salary" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" }
];

function sanitizeText(value) {
  return String(value || "").trim();
}

function buildExpenseScope(user, activeStoreId) {
  if (user.role !== "SUPER_ADMIN") {
    return user.storeId ? { storeId: user.storeId } : { storeId: "__NO_STORE__" };
  }

  if (activeStoreId) {
    return { storeId: activeStoreId };
  }

  return {};
}

function normalizeDate(value, fallback) {
  const date = value ? new Date(String(value)) : fallback;
  return Number.isNaN(date?.getTime?.()) ? fallback : date;
}

export async function getExpenseTrackerData(user, activeStoreId, filters = {}) {
  const today = new Date();
  const from = startOfDay(normalizeDate(filters.from, today));
  const to = endOfDay(normalizeDate(filters.to, today));
  const type = sanitizeText(filters.type);
  const scope = buildExpenseScope(user, activeStoreId);

  const expenses = await prisma.expense.findMany({
    where: {
      ...scope,
      ...(type ? { type } : {}),
      incurredOn: {
        gte: from,
        lte: to
      }
    },
    include: {
      store: {
        select: { id: true, nameEn: true }
      }
    },
    orderBy: [{ incurredOn: "desc" }, { createdAt: "desc" }]
  });

  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const groupedByType = EXPENSE_TYPE_OPTIONS.map((option) => ({
    ...option,
    total: expenses.filter((expense) => expense.type === option.value).reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  })).filter((entry) => entry.total > 0);

  const stores = user.role === "SUPER_ADMIN"
    ? await prisma.store.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } })
    : [];

  return {
    filters: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      type
    },
    stores,
    activeStoreId,
    scopeMode: user.role === "SUPER_ADMIN" && !activeStoreId ? "all-stores" : "single-store",
    summary: {
      totalAmount,
      totalEntries: expenses.length,
      groupedByType
    },
    expenses,
    expenseTypes: EXPENSE_TYPE_OPTIONS
  };
}
