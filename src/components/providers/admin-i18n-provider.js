"use client";

import { I18nextProvider } from "react-i18next";
import { i18n } from "@/modules/i18n/i18n";
import { DynamicI18nLoader } from "@/components/providers/dynamic-i18n-loader";
import { RuntimeDomTranslator } from "@/components/providers/runtime-dom-translator";

export function AdminI18nProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <DynamicI18nLoader>
        <RuntimeDomTranslator>{children}</RuntimeDomTranslator>
      </DynamicI18nLoader>
    </I18nextProvider>
  );
}
