"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { Select } from "@/components/ui/select";

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
    <div className="flex items-center" data-no-translate="true">
      <Select
        value={activeStoreId || ""}
        onChange={(e) => handleStoreChange(e.target.value)}
        disabled={isSwitching}
        icon={Store}
        align="right"
        className="h-10 min-w-[150px] rounded-xl border-slate-200/90 bg-white text-sm font-semibold text-slate-800 shadow-2xs hover:border-slate-300"
      >
        <option value="">{t("header.allStores")}</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {getStoreLabel(store)}
          </option>
        ))}
      </Select>
    </div>
  );
}
