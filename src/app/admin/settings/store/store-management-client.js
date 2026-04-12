"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Pencil, Plus, Search, Store, Upload, UserMinus, UserPlus, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { assignStoreManager, createStoreManager, saveStoreDetails, unassignStoreManager } from "./actions";

const DEFAULT_MANAGER_PASSWORD = "password123";
const INITIAL_ACTION_STATE = { status: "idle", message: "" };

function Toast({ toast, onClose }) {
  const { t } = useTranslation();

  if (!toast) return null;

  const isError = toast.status === "error";

  return (
    <div className="fixed right-6 top-6 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-3">
        {isError ? <CircleAlert className="mt-0.5 h-5 w-5 text-[#13508b]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{isError ? t("storeManagement.statusError") : t("storeManagement.statusSuccess")}</div>
          <div className="mt-1 text-sm text-slate-600">{toast.message}</div>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">{t("storeManagement.close")}</button>
      </div>
    </div>
  );
}

function StoreLogoInput({ selectedStore }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(selectedStore?.logoUrl || "");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setPreviewUrl(selectedStore?.logoUrl || "");
  }, [selectedStore?.id, selectedStore?.logoUrl]);

  useEffect(() => () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  function updatePreview(file) {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl((currentUrl) => {
      if (currentUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });
  }

  function syncDroppedFile(file) {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    updatePreview(file);
  }

  return (
    <label className="block text-sm text-slate-700 md:col-span-2">
      <span className="mb-2 block font-medium">{t("storeManagement.storeLogo")}</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && file.type.startsWith("image/")) {
            syncDroppedFile(file);
          }
        }}
        className={`rounded-2xl border border-dashed px-4 py-5 transition-colors ${isDragging ? "border-[#2771cb] bg-[#e5f1ff]" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
      >
        <input
          ref={inputRef}
          name="storeLogo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => updatePreview(event.target.files?.[0])}
        />
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={selectedStore?.nameEn
                  ? t("storeManagement.storeLogoPreview", { storeName: translateContent(selectedStore.nameEn) })
                  : t("storeManagement.defaultStoreLogoPreview")}
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl object-cover"
                unoptimized={previewUrl.startsWith("blob:")}
              />
            ) : (
              <Upload className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-slate-900">{t("storeManagement.uploadStoreLogo")}</div>
            <div className="mt-1 text-sm text-slate-500">{t("storeManagement.uploadStoreLogoHint")}</div>
          </div>
        </div>
      </div>
    </label>
  );
}

function ModalActions({ pending, submitLabel, onCancel }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 flex gap-3">
      <button type="button" onClick={onCancel} className="flex-1 rounded-2xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200">
        {t("common.cancel")}
      </button>
      <Button type="submit" className="flex-1 rounded-2xl py-3" disabled={pending}>
        {pending ? t("common.saving") : submitLabel}
      </Button>
    </div>
  );
}

function StoreDetailsModal({ isOpen, selectedStore, allowUserStoreFallback, onClose, onToast, onSuccess }) {
  const { t } = useTranslation();
  const [state, formAction, pending] = useActionState(saveStoreDetails, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    onToast(state);
    if (state.status === "success") {
      onSuccess(state);
      onClose();
    }
  }, [onClose, onSuccess, onToast, state]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-2xl" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">{selectedStore ? t("storeManagement.editStore") : t("storeManagement.createStore")}</h3>
      <p className="mt-2 text-sm text-slate-500">{t("storeManagement.storeModalSubtitle")}</p>
      <form action={formAction} className="mt-6 space-y-5" encType="multipart/form-data">
        <input type="hidden" name="storeId" value={selectedStore?.id || ""} />
        <input type="hidden" name="allowUserStoreFallback" value={String(allowUserStoreFallback)} />

        <div className="grid gap-5 md:grid-cols-2">
          <StoreLogoInput selectedStore={selectedStore} />

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">{t("storeManagement.storeName")}</span>
            <input name="storeName" type="text" required defaultValue={selectedStore?.nameEn || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("storeManagement.storeNamePlaceholder")} />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">{t("storeManagement.storeLocation")}</span>
            <input name="storeLocation" type="text" defaultValue={selectedStore?.location || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("storeManagement.storeLocationPlaceholder")} />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">{t("storeManagement.vatNumber")}</span>
            <input name="vatNumber" type="text" defaultValue={selectedStore?.vatNumber || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("storeManagement.vatNumberPlaceholder")} />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-2 block font-medium">{t("storeManagement.vatPercentage")}</span>
            <input name="vatPercentage" type="number" min="0" step="0.01" defaultValue={selectedStore?.vatPercentage ?? 0} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="5" />
          </label>
        </div>

        <ModalActions pending={pending} submitLabel={selectedStore ? t("storeManagement.saveStore") : t("storeManagement.createStore")} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function AssignManagerModal({ isOpen, selectedStore, managers, onClose, onToast, onSuccess }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [state, formAction, pending] = useActionState(assignStoreManager, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    onToast(state);
    if (state.status === "success") {
      onSuccess();
      onClose();
    }
  }, [onClose, onSuccess, onToast, state]);

  const managerOptions = useMemo(() => {
    return [...managers].sort((left, right) => {
      if (!left.storeId && right.storeId) return -1;
      if (left.storeId && !right.storeId) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [managers]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-lg" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">{t("storeManagement.assignExistingManager")}</h3>
      <p className="mt-2 text-sm text-slate-500">{t("storeManagement.assignManagerSubtitle", { storeName: selectedStore?.nameEn ? translateContent(selectedStore.nameEn) : t("storeManagement.thisStore") })}</p>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="storeId" value={selectedStore?.id || ""} />

        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">{t("storeManagement.manager")}</span>
          <select name="managerId" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <option value="">{t("storeManagement.selectManager")}</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.store
                  ? t("storeManagement.managerOptionAssigned", {
                      name: manager.name,
                      email: manager.email,
                      storeName: translateContent(manager.store.nameEn)
                    })
                  : t("storeManagement.managerOptionUnassigned", {
                      name: manager.name,
                      email: manager.email
                    })}
              </option>
            ))}
          </select>
        </label>

        <ModalActions pending={pending} submitLabel={t("storeManagement.assignManager")} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function CreateManagerModal({ isOpen, selectedStore, onClose, onToast, onSuccess }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [state, formAction, pending] = useActionState(createStoreManager, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    onToast(state);
    if (state.status === "success") {
      onSuccess();
      onClose();
    }
  }, [onClose, onSuccess, onToast, state]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-lg" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">{t("storeManagement.createManager")}</h3>
      <p className="mt-2 text-sm text-slate-500">{t("storeManagement.createManagerSubtitle", { storeName: selectedStore?.nameEn ? translateContent(selectedStore.nameEn) : t("storeManagement.thisStore") })}</p>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="storeId" value={selectedStore?.id || ""} />

        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">{t("storeManagement.managerName")}</span>
          <input name="managerName" type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("storeManagement.managerNamePlaceholder")} />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">{t("storeManagement.managerEmail")}</span>
          <input name="managerEmail" type="email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("storeManagement.managerEmailPlaceholder")} />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-medium">{t("storeManagement.password")}</span>
          <input name="managerPassword" type="text" defaultValue={DEFAULT_MANAGER_PASSWORD} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          <span className="mt-2 block text-xs text-slate-500">{t("storeManagement.defaultPasswordHint", { password: DEFAULT_MANAGER_PASSWORD })}</span>
        </label>

        <ModalActions pending={pending} submitLabel={t("storeManagement.createManager")} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function UnassignManagerModal({ isOpen, manager, storeId, onClose, onToast, onSuccess }) {
  const { t } = useTranslation();
  const [state, formAction, pending] = useActionState(unassignStoreManager, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    onToast(state);
    if (state.status === "success") {
      onSuccess();
      onClose();
    }
  }, [onClose, onSuccess, onToast, state]);

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-md" onBackdropClick={onClose}>
      <h3 className="text-2xl font-bold text-slate-900">{t("storeManagement.removeManager")}</h3>
      <p className="mt-2 text-sm text-slate-500">{manager ? t("storeManagement.removeManagerPrompt", { name: manager.name }) : t("storeManagement.removeManagerFallback")}</p>
      <form action={formAction} className="mt-6">
        <input type="hidden" name="managerId" value={manager?.id || ""} />
        <input type="hidden" name="storeId" value={storeId || ""} />
        <ModalActions pending={pending} submitLabel={t("storeManagement.removeManager")} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-black text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}

function getInitials(name) {
  return String(name || "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function StoreManagementClient({
  title,
  subtitle,
  stores,
  selectedStore,
  assignedManagers,
  managers,
  showStoreList,
  createLink,
  manageLinkPrefix,
  allowUserStoreFallback = false
}) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateManagerModalOpen, setIsCreateManagerModalOpen] = useState(false);
  const [managerToUnassign, setManagerToUnassign] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedStoreId = selectedStore?.id || "";
  const localizedTitle = showStoreList
    ? t("storeManagement.multiStoreTitle", { defaultValue: title })
    : t("pages.storeSettingsTitle", { defaultValue: title });
  const localizedSubtitle = showStoreList
    ? t("storeManagement.multiStoreSubtitle", { defaultValue: subtitle })
    : t("pages.storeSettingsSubtitle", { defaultValue: subtitle });
  const currentQuery = useMemo(() => new URLSearchParams(searchParams?.toString() || ""), [searchParams]);
  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return stores;

    return stores.filter((store) => {
      const translatedName = translateContent(store.nameEn).toLowerCase();
      const translatedLocation = store.location ? translateContent(store.location).toLowerCase() : "";

      return store.nameEn.toLowerCase().includes(normalizedQuery)
        || translatedName.includes(normalizedQuery)
        || (store.location || "").toLowerCase().includes(normalizedQuery)
        || translatedLocation.includes(normalizedQuery)
        || (store.vatNumber || "").toLowerCase().includes(normalizedQuery);
    });
  }, [query, stores, translateContent]);

  function buildStoreHref(storeId) {
    const params = new URLSearchParams(currentQuery.toString());
    if (storeId) {
      params.set("storeId", storeId);
    } else {
      params.delete("storeId");
    }

    const nextQuery = params.toString();
    return `${manageLinkPrefix}${nextQuery ? `?${nextQuery}` : ""}`;
  }

  function handleStoreSaved(state) {
    if (state.storeId) {
      const nextHref = buildStoreHref(state.storeId);
      router.replace(nextHref);
    }
    router.refresh();
  }

  function handleRefresh() {
    router.refresh();
  }

  const unassignedManagers = managers.filter((manager) => !manager.storeId).length;

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <StoreDetailsModal
        isOpen={isStoreModalOpen}
        selectedStore={selectedStore}
        allowUserStoreFallback={allowUserStoreFallback}
        onClose={() => setIsStoreModalOpen(false)}
        onToast={setToast}
        onSuccess={handleStoreSaved}
      />
      <AssignManagerModal
        isOpen={isAssignModalOpen}
        selectedStore={selectedStore}
        managers={managers}
        onClose={() => setIsAssignModalOpen(false)}
        onToast={setToast}
        onSuccess={handleRefresh}
      />
      <CreateManagerModal
        isOpen={isCreateManagerModalOpen}
        selectedStore={selectedStore}
        onClose={() => setIsCreateManagerModalOpen(false)}
        onToast={setToast}
        onSuccess={handleRefresh}
      />
      <UnassignManagerModal
        isOpen={Boolean(managerToUnassign)}
        manager={managerToUnassign}
        storeId={selectedStoreId}
        onClose={() => setManagerToUnassign(null)}
        onToast={setToast}
        onSuccess={handleRefresh}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{localizedTitle}</h2>
            <p className="text-sm text-slate-500">{localizedSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {createLink ? (
              <Link href={createLink} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                {t("storeManagement.openMultiStoreView")}
              </Link>
            ) : null}
            <Button className="rounded-2xl px-4 py-3" onClick={() => setIsStoreModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {selectedStore ? t("storeManagement.editStore") : t("storeManagement.createStore")}
            </Button>
            {selectedStore ? (
              <Button variant="outline" className="rounded-2xl px-4 py-3" onClick={() => setIsAssignModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t("storeManagement.assignManager")}
              </Button>
            ) : null}
            {selectedStore ? (
              <Button variant="outline" className="rounded-2xl px-4 py-3" onClick={() => setIsCreateManagerModalOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                {t("storeManagement.newManager")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label={t("storeManagement.stores")} value={stores.length} hint={t("storeManagement.storesHint")} />
          <SummaryCard label={t("storeManagement.assignedManagers")} value={managers.length - unassignedManagers} hint={t("storeManagement.assignedManagersHint")} />
          <SummaryCard label={t("storeManagement.unassignedManagers")} value={unassignedManagers} hint={t("storeManagement.unassignedManagersHint")} />
        </div>

        {showStoreList ? (
          <Card className="p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("storeManagement.searchStoresPlaceholder")}
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400"
                />
              </label>
              <div className="flex items-center justify-end text-sm text-slate-500">{t("storeManagement.showingStores", { visible: filteredStores.length, total: stores.length })}</div>
            </div>
          </Card>
        ) : null}

        {showStoreList ? (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px_130px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <div>{t("storeManagement.columnStore")}</div>
              <div>{t("storeManagement.columnLocation")}</div>
              <div>{t("storeManagement.columnManagers")}</div>
              <div className="text-right">{t("common.action")}</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredStores.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">{t("storeManagement.noStoresMatch")}</div>
              ) : null}
              {filteredStores.map((store) => {
                const isActive = store.id === selectedStoreId;

                return (
                  <div key={store.id} className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px_130px] items-center gap-4 px-6 py-5 ${isActive ? "bg-[#e5f1ff]/70" : "bg-white"}`}>
                    <Link href={buildStoreHref(store.id)} className="min-w-0">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isActive ? "bg-[#2771cb] text-white" : "bg-slate-100 text-slate-700"}`}>
                          {store.logoUrl ? <Image src={store.logoUrl} alt={translateContent(store.nameEn)} width={48} height={48} className="h-12 w-12 rounded-2xl object-cover" /> : getInitials(store.nameEn)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{translateContent(store.nameEn)}</div>
                          <div className="mt-1 truncate text-sm text-slate-500">{t("storeManagement.vatSummary", { percentage: store.vatPercentage ?? 0 })}{store.vatNumber ? ` • ${store.vatNumber}` : ""}</div>
                        </div>
                      </div>
                    </Link>
                    <div className="text-sm text-slate-600">{store.location ? translateContent(store.location) : t("storeManagement.noLocation")}</div>
                    <div className="text-sm font-semibold text-slate-900">{store.users.length}</div>
                    <div className="flex justify-end">
                      <Link href={buildStoreHref(store.id)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        {t("storeManagement.open")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {selectedStore ? (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                    {selectedStore.logoUrl ? <Image src={selectedStore.logoUrl} alt={translateContent(selectedStore.nameEn)} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" /> : getInitials(selectedStore.nameEn)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">{translateContent(selectedStore.nameEn)}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {selectedStore.location ? translateContent(selectedStore.location) : t("storeManagement.noLocation")}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{t("storeManagement.vatSummary", { percentage: Number(selectedStore.vatPercentage || 0).toFixed(2) })}{selectedStore.vatNumber ? ` • ${selectedStore.vatNumber}` : ""}</div>
                    <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                      <span>{t("storeManagement.assignedManagerCount", { count: assignedManagers.length })}</span>
                      <span>{t("storeManagement.storeCode", { code: selectedStore.code })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {showStoreList ? null : (
                    <Link href={`${pathname === "/admin/settings/store" ? "/admin/settings/store/manage" : "/admin/settings/store"}?storeId=${selectedStore.id}`} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                      <Store className="mr-2 h-4 w-4" />
                      {pathname === "/admin/settings/store" ? t("storeManagement.openMultiStoreView") : t("storeManagement.openStoreSetup")}
                    </Link>
                  )}
                  <Button variant="outline" className="rounded-2xl px-4 py-3" onClick={() => setIsStoreModalOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("storeManagement.editDetails")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">{t("storeManagement.assignedManagers")}</div>
                  <div className="text-sm text-slate-500">{t("storeManagement.assignedManagersSubtitle")}</div>
                </div>
              </div>

              {assignedManagers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  {t("storeManagement.noAssignedManagers")}
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedManagers.map((manager) => (
                    <div key={manager.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{manager.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{manager.email}</div>
                      </div>
                      <Button variant="outline" className="rounded-xl" onClick={() => setManagerToUnassign(manager)}>
                        <UserMinus className="mr-2 h-4 w-4" />
                        {t("storeManagement.removeManager")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-10 text-center text-slate-500">
            {t("storeManagement.selectStoreEmpty")}
          </Card>
        )}
      </div>
    </>
  );
}
