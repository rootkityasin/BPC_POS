import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/modules/i18n/resources";

const DEFAULT_LANGUAGE = "bn";
const RESOURCE_CACHE_KEY = "bpc-admin-i18n-resources";
const RESOURCE_CACHE_VERSION = "v2";

function mergeResources(cachedResources) {
  return {
    en: {
      translation: {
        ...resources.en.translation,
        ...(cachedResources?.en?.translation || {})
      }
    },
    bn: {
      translation: {
        ...resources.bn.translation,
        ...(cachedResources?.bn?.translation || {})
      }
    }
  };
}

function getCachedResources() {
  if (typeof window === "undefined") return resources;

  try {
    const rawCache = window.localStorage.getItem(RESOURCE_CACHE_KEY);
    if (!rawCache) return resources;

    const parsedCache = JSON.parse(rawCache);
    if (parsedCache.version !== RESOURCE_CACHE_VERSION) return resources;

    return mergeResources(parsedCache.resources);
  } catch {
    return resources;
  }
}

function cacheResources(resourceMap) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      RESOURCE_CACHE_KEY,
      JSON.stringify({ version: RESOURCE_CACHE_VERSION, resources: resourceMap })
    );
  } catch {
    return;
  }
}

function getInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const storedLanguage = window.localStorage.getItem("bpc-admin-language");
  return storedLanguage === "bn" ? "bn" : DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  const resolvedResources = getCachedResources();

  i18n.use(initReactI18next).init({
    resources: resolvedResources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false
    }
  });

  cacheResources(resources);
}

export { i18n };
export const LANGUAGE_STORAGE_KEY = "bpc-admin-language";

export function getContentTranslationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
