"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, CircleAlert, Store, Upload, UserMinus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveStoreSetup, unassignStoreManager } from "./actions";

const DEFAULT_MANAGER_PASSWORD = "password123";
const INITIAL_ACTION_STATE = { status: "idle", message: "" };

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.status === "error";

  return (
    <div className="fixed right-6 top-6 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-3">
        {isError ? <CircleAlert className="mt-0.5 h-5 w-5 text-rose-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{isError ? "Action failed" : "Success"}</div>
          <div className="mt-1 text-sm text-slate-600">{toast.message}</div>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
      </div>
    </div>
  );
}

function SubmitButton({ children }) {
  return <Button type="submit" className="rounded-2xl px-6 py-3">{children}</Button>;
}

function StoreLogoInput({ selectedStore }) {
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
      <span className="mb-2 block font-medium">Store Logo</span>
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
        className={`rounded-2xl border border-dashed px-4 py-5 transition-colors ${isDragging ? "border-[#ff242d] bg-red-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
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
              <Image src={previewUrl} alt={selectedStore?.nameEn || "Store logo preview"} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" unoptimized={previewUrl.startsWith("blob:")} />
            ) : (
              <Upload className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-slate-900">Drag and drop an image here</div>
            <div className="mt-1 text-sm text-slate-500">Or click to browse and upload a new store logo.</div>
          </div>
        </div>
      </div>
    </label>
  );
}

function UnassignManagerForm({ managerId, storeId, managerName, onToast }) {
  const [state, formAction, pending] = useActionState(unassignStoreManager, INITIAL_ACTION_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "idle") {
      onToast(state);
      if (state.status === "success") {
        router.refresh();
      }
    }
  }, [onToast, router, state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="managerId" value={managerId} />
      <input type="hidden" name="storeId" value={storeId} />
      <Button type="submit" variant="outline" className="rounded-xl" disabled={pending}>
        <UserMinus className="mr-2 h-4 w-4" />
        {pending ? "Removing..." : `Unassign ${managerName}`}
      </Button>
    </form>
  );
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
  const [state, formAction, pending] = useActionState(saveStoreSetup, INITIAL_ACTION_STATE);
  const [toast, setToast] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (state.status !== "idle") {
      setToast(state);
      if (state.status === "success" && state.storeId && pathname === "/admin/settings/store/manage") {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("storeId", state.storeId);
        router.replace(`/admin/settings/store/manage?${params.toString()}`);
      }
      if (state.status === "success") {
        router.refresh();
      }
    }
  }, [pathname, router, searchParams, state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedStoreId = selectedStore?.id || "";
  const currentQuery = useMemo(() => new URLSearchParams(searchParams?.toString() || ""), [searchParams]);

  function buildStoreHref(storeId) {
    const params = new URLSearchParams(currentQuery.toString());
    if (storeId) {
      params.set("storeId", storeId);
    } else {
      params.delete("storeId");
    }

    const query = params.toString();
    return `${manageLinkPrefix}${query ? `?${query}` : ""}`;
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          {createLink ? (
            <Link href={createLink} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Create New Store
            </Link>
          ) : null}
        </div>

        <div className={`grid gap-6 ${showStoreList ? "xl:grid-cols-[320px_minmax(0,1fr)]" : ""}`}>
          {showStoreList ? (
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Building2 className="h-5 w-5" />
                All Stores
              </div>
              <div className="space-y-3">
                <Link href={buildStoreHref("")} className={`block rounded-2xl border px-4 py-4 transition-colors ${!selectedStoreId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="font-semibold">Create New Store</div>
                  <div className={`mt-1 text-sm ${!selectedStoreId ? "text-slate-200" : "text-slate-500"}`}>Open a blank store setup form.</div>
                </Link>
                {stores.map((store) => {
                  const active = selectedStoreId === store.id;
                  return (
                    <Link key={store.id} href={buildStoreHref(store.id)} className={`block rounded-2xl border px-4 py-4 transition-colors ${active ? "border-[#ff242d] bg-red-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <div className="font-semibold text-slate-900">{store.nameEn}</div>
                      <div className="mt-1 text-sm text-slate-500">{store.location || "No location"}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{store.users.length} managers</div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <div className="space-y-6">
            <form action={formAction} className="space-y-6" encType="multipart/form-data">
              <input type="hidden" name="storeId" value={selectedStoreId} />
              <input type="hidden" name="allowUserStoreFallback" value={String(allowUserStoreFallback)} />

              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Store Details</h3>
                  <p className="mt-1 text-sm text-slate-500">Upload the branding and save the VAT values used during checkout.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <StoreLogoInput selectedStore={selectedStore} />

                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Store Name</span>
                    <input name="storeName" type="text" required defaultValue={selectedStore?.nameEn || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="BPC Dhaka" />
                  </label>

                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Store Location</span>
                    <input name="storeLocation" type="text" defaultValue={selectedStore?.location || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Dhaka, Bangladesh" />
                  </label>

                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">VAT Number</span>
                    <input name="vatNumber" type="text" defaultValue={selectedStore?.vatNumber || ""} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Optional" />
                  </label>

                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">VAT Percentage</span>
                    <input name="vatPercentage" type="number" min="0" step="0.01" defaultValue={selectedStore?.vatPercentage ?? 0} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="5" />
                  </label>
                </div>
              </Card>

              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign Existing Manager</h3>
                  <p className="mt-1 text-sm text-slate-500">Select any manager to assign or reassign them to this store.</p>
                </div>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Manager</span>
                  <select name="existingManagerId" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <option value="">No manager selected</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email}){manager.store ? ` - ${manager.store.nameEn}` : " - Unassigned"}
                      </option>
                    ))}
                  </select>
                </label>
              </Card>

              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create New Manager</h3>
                  <p className="mt-1 text-sm text-slate-500">Leave this section empty if you only want to update store details.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Manager Name</span>
                    <input name="managerName" type="text" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Store Manager" />
                  </label>

                  <label className="block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">Manager Email</span>
                    <input name="managerEmail" type="email" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="manager@shop.local" />
                  </label>

                  <label className="block text-sm text-slate-700 md:col-span-2">
                    <span className="mb-2 block font-medium">Password</span>
                    <input name="managerPassword" type="text" defaultValue={DEFAULT_MANAGER_PASSWORD} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                    <span className="mt-2 block text-xs text-slate-500">Default password is <code>password123</code> unless you change it here.</span>
                  </label>
                </div>
              </Card>

              <div className="flex justify-end">
                <SubmitButton>{pending ? "Saving..." : selectedStoreId ? "Save Store Setup" : "Create Store"}</SubmitButton>
              </div>
            </form>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900">Assigned Managers</h3>
                <div className="mt-5 space-y-3">
                  {selectedStoreId && assignedManagers.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">No managers are assigned to this store yet.</div>
                  ) : null}
                  {!selectedStoreId ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">Create the store first, then assign or remove managers.</div>
                  ) : null}
                  {assignedManagers.map((manager) => (
                    <div key={manager.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{manager.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{manager.email}</div>
                        </div>
                        <UnassignManagerForm managerId={manager.id} storeId={selectedStoreId} managerName={manager.name} onToast={setToast} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900">Current Store Snapshot</h3>
                <div className="mt-5 space-y-4 text-sm text-slate-600">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Store</div>
                    <div className="mt-1 font-medium text-slate-900">{selectedStore?.nameEn || "Not configured yet"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</div>
                    <div className="mt-1">{selectedStore?.location || "Not set"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">VAT Number</div>
                    <div className="mt-1">{selectedStore?.vatNumber || "Not set"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">VAT Percentage</div>
                    <div className="mt-1">{Number(selectedStore?.vatPercentage || 0).toFixed(2)}%</div>
                  </div>
                  {selectedStore ? (
                    <Link href={pathname === "/admin/settings/store/manage" ? `/admin/settings/store?storeId=${selectedStore.id}` : `/admin/settings/store/manage?storeId=${selectedStore.id}`} className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-[#ff242d]">
                      <Store className="h-4 w-4" />
                      {pathname === "/admin/settings/store/manage" ? "Open current-store setup view" : "Open multi-store manager"}
                    </Link>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
