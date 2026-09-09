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
      const isPostLogin = typeof window !== "undefined" && window.location.search.includes("login=1");
      if (isPostLogin) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "bn");
        document.cookie = `${LANGUAGE_STORAGE_KEY}=bn; path=/; max-age=31536000; SameSite=Lax`;
        if (i18n.language !== "bn") {
          i18n.changeLanguage("bn");
        }
        return;
      }

      const storedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang && (storedLang === "bn" || storedLang === "en")) {
        if (storedLang !== i18n.language) {
          i18n.changeLanguage(storedLang);
        }
        document.cookie = `${LANGUAGE_STORAGE_KEY}=${storedLang}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        const lang = initialLanguage || "bn";
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        document.cookie = `${LANGUAGE_STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
        if (i18n.language !== lang) {
          i18n.changeLanguage(lang);
        }
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
