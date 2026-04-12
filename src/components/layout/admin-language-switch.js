"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_STORAGE_KEY } from "@/modules/i18n/i18n";

export function AdminLanguageSwitch() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, i18n.language);
  }, [i18n, i18n.language]);

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "en" ? "bn" : "en");
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      data-no-translate="true"
      className="rounded-full border border-[#e5f1ff] bg-[#e5f1ff] px-3 py-1.5 text-xs font-semibold text-[#13508b] transition-colors hover:bg-[#d6e8ff]"
    >
      {t("header.switchToBangla")}
    </button>
  );
}
