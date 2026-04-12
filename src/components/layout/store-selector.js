"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";

export function StoreSelector({ stores, activeStoreId }) {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [isSwitching, setIsSwitching] = useState(false);

  function getStoreLabel(store) {
    const banglaName = String(store?.nameBn || "").trim();
    if (i18n.language === "bn") {
      return banglaName || translateContent(store?.nameEn);
    }

    return String(store?.nameEn || "");
  }

  async function handleStoreChange(newStoreId) {
    if (newStoreId === activeStoreId) return;

    setIsSwitching(true);
    try {
      const response = await fetch("/api/v1/auth/active-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: newStoreId })
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("[STORE_SWITCH]", error);
    } finally {
      setIsSwitching(false);
    }
  }

  if (!stores || stores.length === 0) return null;

  return (
    <div className="flex items-center gap-2" data-no-translate="true">
      <Store className="h-4 w-4 text-slate-400" />
      <select
        value={activeStoreId || ""}
        onChange={(e) => handleStoreChange(e.target.value)}
        disabled={isSwitching}
        data-no-translate="true"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#2771cb] focus:ring-1 focus:ring-[#2771cb] disabled:opacity-50"
      >
        <option value="">{t("header.allStores")}</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {getStoreLabel(store)}
          </option>
        ))}
      </select>
    </div>
  );
}
