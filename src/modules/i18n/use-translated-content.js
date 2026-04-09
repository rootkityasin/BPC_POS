"use client";

import { useTranslation } from "react-i18next";
import { getContentTranslationKey } from "@/modules/i18n/i18n";

export function useTranslatedContent() {
  const { t } = useTranslation();

  function translateContent(value, fallback = "") {
    const source = String(value || fallback || "");
    if (!source) return "";

    return t(`content.${getContentTranslationKey(source)}`, {
      defaultValue: source
    });
  }

  return { translateContent };
}
