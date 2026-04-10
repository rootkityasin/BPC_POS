"use client";

import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, KeyRound, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { I18nText } from "@/components/i18n/i18n-text";
import { resetManagerPassword, saveManagerOverrides, toggleManagerActive } from "./actions";

const INITIAL_ACTION_STATE = { status: "idle", message: "" };

function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed right-6 top-6 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-3">
        {toast.status === "error" ? <CircleAlert className="mt-0.5 h-5 w-5 text-rose-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{toast.status === "error" ? "Action failed" : "Success"}</div>
          <div className="mt-1 text-sm text-slate-600">{toast.message}</div>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
      </div>
    </div>
  );
}

function getInitials(name) {
  return String(name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ManagerStatusForm({ manager, onToast }) {
  const [state, formAction, pending] = useActionState(toggleManagerActive.bind(null, manager.id), INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status !== "idle") {
      onToast(state);
    }
  }, [onToast, state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="nextState" value={manager.isActive ? "inactive" : "active"} />
      <Button type="submit" variant="outline" className="rounded-xl" disabled={pending}>
        {manager.isActive ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        {pending ? "Saving..." : manager.isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}

function ManagerPasswordForm({ managerId, onToast }) {
  const [state, formAction, pending] = useActionState(resetManagerPassword.bind(null, managerId), INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status !== "idle") {
      onToast(state);
    }
  }, [onToast, state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
      <input name="password" type="text" defaultValue="password123" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="Reset password" />
      <Button type="submit" variant="outline" className="rounded-xl" disabled={pending}>
        <KeyRound className="mr-2 h-4 w-4" />
        {pending ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}

function ManagerPermissionsForm({ manager, permissionSections, onToast }) {
  const [state, formAction, pending] = useActionState(saveManagerOverrides.bind(null, manager.id), INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status !== "idle") {
      onToast(state);
    }
  }, [onToast, state]);

  return (
    <form action={formAction} className="space-y-6 px-6 py-6">
      {permissionSections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">{section.title}</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.feature" fallback="Feature" /></div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.canView" fallback="Can View" /></div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400"><I18nText k="roles.canUpdate" fallback="Can Update" /></div>
            {section.rows.map((row) => (
              <Fragment key={`${manager.id}-${section.title}-${row.key}`}>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <I18nText k={row.labelKey} fallback={row.label} />
                </div>
                <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <input name={row.viewField} type="checkbox" defaultChecked={manager.permissionMap[row.key]?.canView} className="mr-2" />
                  <I18nText k="roles.view" fallback="View" />
                </label>
                <label className="flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <input name={row.manageField} type="checkbox" defaultChecked={manager.permissionMap[row.key]?.canManage} className="mr-2" />
                  <I18nText k="roles.update" fallback="Update" />
                </label>
              </Fragment>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <div className="text-sm text-slate-500">Changes apply only to <span className="font-semibold text-slate-900">{manager.name}</span>.</div>
        <Button type="submit" disabled={pending}><I18nText k="roles.savePermissions" fallback="Save Permissions" /></Button>
      </div>
    </form>
  );
}

export function RolesClient({ managers, permissionSections, stats }) {
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredManagers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return managers.filter((manager) => {
      const matchesQuery = !normalizedQuery
        || manager.name.toLowerCase().includes(normalizedQuery)
        || manager.email.toLowerCase().includes(normalizedQuery)
        || (manager.store?.nameEn || "").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? manager.isActive : !manager.isActive);
      const matchesAssignment = assignmentFilter === "all"
        || (assignmentFilter === "assigned" ? Boolean(manager.storeId) : !manager.storeId);

      return matchesQuery && matchesStatus && matchesAssignment;
    });
  }, [assignmentFilter, managers, query, statusFilter]);

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900"><I18nText k="roles.title" fallback="Manage Roles" /></h2>
            <p className="text-sm text-slate-500"><I18nText k="roles.subtitle" fallback="Super admin controls each manager individually, including store assignment context and feature-level access." /></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/settings/store/manage" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Open Multi-Store Manager
            </Link>
            <Link href="/admin/settings/store" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Open Store Setup
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Managers</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{stats.total}</div>
            <div className="mt-2 text-sm text-slate-500">Total manager accounts under super-admin control.</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned Stores</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{stats.assigned}</div>
            <div className="mt-2 text-sm text-slate-500">Managers currently attached to a store.</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Accounts</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{stats.active}</div>
            <div className="mt-2 text-sm text-slate-500">Managers able to sign in and operate their assigned branch.</div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by manager, email, or store"
                className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400"
              />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="all">All assignments</option>
              <option value="assigned">Assigned only</option>
              <option value="unassigned">Unassigned only</option>
            </select>
          </div>
          <div className="mt-3 text-sm text-slate-500">Showing {filteredManagers.length} of {managers.length} managers.</div>
        </Card>

        <div className="space-y-5">
          {filteredManagers.length === 0 ? (
            <Card className="p-10 text-center text-slate-500">No managers match the current filters.</Card>
          ) : null}

          {filteredManagers.map((manager) => (
            <Card key={manager.id} className="overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                      {getInitials(manager.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{manager.name}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${manager.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {manager.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {manager.store?.nameEn || "Unassigned store"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">{manager.email}</div>
                      <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                        <span>{manager.enabledCount} enabled feature groups</span>
                        <span>Created {new Date(manager.createdAt).toLocaleDateString()}</span>
                        <span>Role {manager.role.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Store Assignment</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{manager.store?.nameEn || "No store assigned"}</div>
                      <div className="mt-1 text-sm text-slate-500">Manage assignment in the store management section.</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account Control</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ManagerStatusForm manager={manager} onToast={setToast} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 pt-6">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Reset Password</div>
                  <ManagerPasswordForm managerId={manager.id} onToast={setToast} />
                </div>
              </div>

              <ManagerPermissionsForm manager={manager} permissionSections={permissionSections} onToast={setToast} />
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
