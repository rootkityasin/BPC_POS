import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/modules/i18n/resources";

import { LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE } from "@/modules/i18n/constants";
const RESOURCE_CACHE_KEY = "bpc-admin-i18n-resources";
const RESOURCE_CACHE_VERSION = "v6";
export { LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE };

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return { ...base };
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else if (override[key] !== undefined) {
      result[key] = override[key];
    }
  }
  return result;
}

function mergeResources(cachedResources) {
  return {
    en: {
      translation: deepMerge(resources.en.translation, cachedResources?.en?.translation)
    },
    bn: {
      translation: deepMerge(resources.bn.translation, cachedResources?.bn?.translation)
    }
  };
}

function getCachedResources() {
  if (typeof window === "undefined") return resources;

  try {
    const rawCache = window.localStorage.getItem(RESOURCE_CACHE_KEY);
    if (!rawCache) return resources;

    const parsedCache = JSON.parse(rawCache);
    if (parsedCache.version !== RESOURCE_CACHE_VERSION) {
      window.localStorage.removeItem(RESOURCE_CACHE_KEY);
      return resources;
    }

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
  return DEFAULT_LANGUAGE;
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
} else {
  i18n.addResourceBundle("en", "translation", resources.en.translation, true, true);
  i18n.addResourceBundle("bn", "translation", resources.bn.translation, true, true);
}

export { i18n };

export function getContentTranslationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
