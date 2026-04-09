import { prisma } from "@/lib/prisma";

const DEFAULT_LIBRETRANSLATE_URL = "http://localhost:5000/translate";

const translationCache = globalThis.__bpcTranslationCache || new Map();
globalThis.__bpcTranslationCache = translationCache;

function getCacheKey(sourceLanguage, targetLanguage, text) {
  return `${sourceLanguage}:${targetLanguage}:${text}`;
}

function looksTranslatable(text) {
  const value = String(text || "").trim();
  if (!value || value.length < 2) return false;
  if (/^[\d\s.,:%()+/-]+$/.test(value)) return false;
  if (/@|https?:\/\//i.test(value)) return false;
  return /[A-Za-z]/.test(value);
}

export async function translateTexts({ texts, sourceLanguage = "en", targetLanguage = "bn" }) {
  const uniqueTexts = [...new Set((texts || []).map((text) => String(text || "").trim()).filter(looksTranslatable))];

  if (targetLanguage === sourceLanguage || uniqueTexts.length === 0) {
    return {};
  }

  const results = {};

  const persistedCacheEntries = await prisma.translationCache.findMany({
    where: {
      sourceLanguage,
      targetLanguage,
      sourceText: { in: uniqueTexts }
    }
  });

  for (const entry of persistedCacheEntries) {
    const cacheKey = getCacheKey(sourceLanguage, targetLanguage, entry.sourceText);
    translationCache.set(cacheKey, entry.translatedText);
    results[entry.sourceText] = entry.translatedText;
  }

  const uncachedTexts = [];
  for (const text of uniqueTexts) {
    if (results[text]) continue;

    const cacheKey = getCacheKey(sourceLanguage, targetLanguage, text);
    if (translationCache.has(cacheKey)) {
      results[text] = translationCache.get(cacheKey);
      continue;
    }

    uncachedTexts.push(text);
  }

  if (uncachedTexts.length === 0) {
    return results;
  }

  const endpoint = process.env.LIBRETRANSLATE_URL || DEFAULT_LIBRETRANSLATE_URL;
  const newCacheRows = [];

  for (const text of uncachedTexts) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: "text"
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        results[text] = text;
        continue;
      }

      const data = await response.json();
      const translatedText = String(data.translatedText || text);
      const cacheKey = getCacheKey(sourceLanguage, targetLanguage, text);

      translationCache.set(cacheKey, translatedText);
      results[text] = translatedText;
      newCacheRows.push({
        sourceLanguage,
        targetLanguage,
        sourceText: text,
        translatedText
      });
    } catch {
      results[text] = text;
    }
  }

  if (newCacheRows.length > 0) {
    await prisma.translationCache.createMany({
      data: newCacheRows,
      skipDuplicates: true
    });
  }

  return results;
}
