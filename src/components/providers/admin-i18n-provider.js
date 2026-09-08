"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n, LANGUAGE_STORAGE_KEY } from "@/modules/i18n/i18n";
import { DynamicI18nLoader } from "@/components/providers/dynamic-i18n-loader";
import { RuntimeDomTranslator } from "@/components/providers/runtime-dom-translator";

export function AdminI18nProvider({ initialLanguage, children }) {
  if (initialLanguage && i18n.language !== initialLanguage && (initialLanguage === "bn" || initialLanguage === "en")) {
    i18n.changeLanguage(initialLanguage);
  }

  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang && (storedLang === "bn" || storedLang === "en")) {
        if (storedLang !== i18n.language) {
          i18n.changeLanguage(storedLang);
        }
        document.cookie = `${LANGUAGE_STORAGE_KEY}=${storedLang}; path=/; max-age=31536000; SameSite=Lax`;
      } else if (initialLanguage) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, [initialLanguage]);

  return (
    <I18nextProvider i18n={i18n}>
      <DynamicI18nLoader>
        <RuntimeDomTranslator>{children}</RuntimeDomTranslator>
      </DynamicI18nLoader>
    </I18nextProvider>
  );
}
