"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getContentTranslationKey } from "@/modules/i18n/i18n";

export function DynamicI18nLoader({ children }) {
  const { i18n } = useTranslation();
  const isLoadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDynamicTranslations() {
      if (i18n.language !== "bn" || isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        const response = await fetch(`/api/v1/translations?targetLanguage=${i18n.language}`);
        if (!response.ok) return;

        const data = await response.json();
        const rows = Array.isArray(data.translations) ? data.translations : [];
        const contentBundle = {};

        for (const row of rows) {
          contentBundle[getContentTranslationKey(row.sourceText)] = row.translatedText;
        }

        if (cancelled || Object.keys(contentBundle).length === 0) {
          return;
        }

        i18n.addResourceBundle(i18n.language, "translation", { content: contentBundle }, true, true);
      } catch {
        return;
      } finally {
        isLoadingRef.current = false;
      }
    }

    loadDynamicTranslations();

    function handleTranslationsUpdated() {
      loadDynamicTranslations();
    }

    window.addEventListener("bpc:translations-updated", handleTranslationsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("bpc:translations-updated", handleTranslationsUpdated);
    };
  }, [i18n, i18n.language]);

  return children;
}
