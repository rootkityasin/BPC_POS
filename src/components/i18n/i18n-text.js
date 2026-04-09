"use client";

import { useTranslation } from "react-i18next";

export function I18nText({ k, fallback, values }) {
  const { t } = useTranslation();
  return t(k, { defaultValue: fallback, ...values });
}
