"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "bpc-runtime-translation-cache";
const SOURCE_ATTR = "data-original-text";
const PLACEHOLDER_ATTR = "data-original-placeholder";
const TITLE_ATTR = "data-original-title";
const ARIA_LABEL_ATTR = "data-original-aria-label";

function shouldTranslateText(text) {
  const value = String(text || "").trim();
  if (!value || value.length < 2) return false;
  if (/^[\d\s.,:%()+/-]+$/.test(value)) return false;
  if (/@|https?:\/\//i.test(value)) return false;
  return /[A-Za-z]/.test(value);
}

function loadCache() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

function getElementTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-no-translate='true']")) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return shouldTranslateText(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }
  return nodes;
}

function getAttributeTargets(root) {
  const targets = [];
  const elements = root.querySelectorAll("input[placeholder], textarea[placeholder], [title], [aria-label], option");

  for (const element of elements) {
    if (element.closest("[data-no-translate='true']")) continue;

    if (element.hasAttribute("placeholder") && shouldTranslateText(element.getAttribute("placeholder"))) {
      targets.push({ element, type: "placeholder", attr: "placeholder", originalAttr: PLACEHOLDER_ATTR });
    }

    if (element.hasAttribute("title") && shouldTranslateText(element.getAttribute("title"))) {
      targets.push({ element, type: "title", attr: "title", originalAttr: TITLE_ATTR });
    }

    if (element.hasAttribute("aria-label") && shouldTranslateText(element.getAttribute("aria-label"))) {
      targets.push({ element, type: "aria-label", attr: "aria-label", originalAttr: ARIA_LABEL_ATTR });
    }

    if (element.tagName === "OPTION" && shouldTranslateText(element.textContent)) {
      targets.push({ element, type: "text", attr: null, originalAttr: SOURCE_ATTR });
    }
  }

  return targets;
}

function getStoredTextNodes(root) {
  const elements = root.querySelectorAll(`[${SOURCE_ATTR}]`);
  const nodes = [];

  for (const element of elements) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        nodes.push(node);
      }
    }
  }

  return nodes;
}

function getStoredAttributeTargets(root) {
  const targets = [];

  root.querySelectorAll(`[${PLACEHOLDER_ATTR}]`).forEach((element) => {
    targets.push({ element, attr: "placeholder", originalAttr: PLACEHOLDER_ATTR, type: "placeholder" });
  });
  root.querySelectorAll(`[${TITLE_ATTR}]`).forEach((element) => {
    targets.push({ element, attr: "title", originalAttr: TITLE_ATTR, type: "title" });
  });
  root.querySelectorAll(`[${ARIA_LABEL_ATTR}]`).forEach((element) => {
    targets.push({ element, attr: "aria-label", originalAttr: ARIA_LABEL_ATTR, type: "aria-label" });
  });
  root.querySelectorAll(`option[${SOURCE_ATTR}]`).forEach((element) => {
    targets.push({ element, attr: null, originalAttr: SOURCE_ATTR, type: "text" });
  });

  return targets;
}

async function fetchTranslations(texts, targetLanguage, cache) {
  const uncachedTexts = texts.filter((text) => !cache[text]);
  if (uncachedTexts.length === 0) return cache;

  const response = await fetch("/api/v1/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts: uncachedTexts,
      sourceLanguage: "en",
      targetLanguage
    })
  });

  if (!response.ok) return cache;

  const data = await response.json();
  const translations = data.translations || {};
  const nextCache = { ...cache, ...translations };
  saveCache(nextCache);
  return nextCache;
}

function restoreEnglish(root) {
  for (const node of getStoredTextNodes(root)) {
    const parent = node.parentElement;
    if (parent?.hasAttribute(SOURCE_ATTR)) {
      node.textContent = parent.getAttribute(SOURCE_ATTR);
    }
  }

  for (const target of getStoredAttributeTargets(root)) {
    if (target.type === "text") {
      if (target.element.hasAttribute(SOURCE_ATTR)) {
        target.element.textContent = target.element.getAttribute(SOURCE_ATTR);
      }
      continue;
    }

    if (target.element.hasAttribute(target.originalAttr)) {
      target.element.setAttribute(target.attr, target.element.getAttribute(target.originalAttr));
    }
  }
}

async function translateDom(root, language) {
  if (language !== "bn") {
    restoreEnglish(root);
    return;
  }

  const textNodes = getElementTextNodes(root);
  const attributeTargets = getAttributeTargets(root);
  const texts = [];

  for (const node of textNodes) {
    const parent = node.parentElement;
    const currentText = node.textContent.trim();
    const storedText = parent?.getAttribute(SOURCE_ATTR);
    const originalText = storedText && !looksTranslatable(currentText) ? storedText : currentText;

    if (parent && storedText !== originalText) {
      parent.setAttribute(SOURCE_ATTR, originalText);
    }

    texts.push(originalText);
  }

  for (const target of attributeTargets) {
    const currentValue = target.type === "text"
      ? target.element.textContent.trim()
      : target.element.getAttribute(target.attr);
    const storedValue = target.type === "text"
      ? target.element.getAttribute(SOURCE_ATTR)
      : target.element.getAttribute(target.originalAttr);
    const originalValue = storedValue && !looksTranslatable(currentValue) ? storedValue : currentValue;

    if (target.type === "text") {
      if (storedValue !== originalValue) {
        target.element.setAttribute(SOURCE_ATTR, originalValue);
      }
    } else if (storedValue !== originalValue) {
      target.element.setAttribute(target.originalAttr, originalValue);
    }

    texts.push(originalValue);
  }

  let cache = loadCache();
  cache = await fetchTranslations([...new Set(texts.filter(shouldTranslateText))], language, cache);

  for (const node of textNodes) {
    const parent = node.parentElement;
    const sourceText = parent?.getAttribute(SOURCE_ATTR) || node.textContent.trim();
    node.textContent = cache[sourceText] || sourceText;
  }

  for (const target of attributeTargets) {
    const sourceText = target.type === "text"
      ? target.element.getAttribute(SOURCE_ATTR)
      : target.element.getAttribute(target.originalAttr);

    const translatedText = cache[sourceText] || sourceText;
    if (target.type === "text") {
      target.element.textContent = translatedText;
      continue;
    }

    target.element.setAttribute(target.attr, translatedText);
  }
}

export function RuntimeDomTranslator({ children }) {
  const { i18n } = useTranslation();
  const isApplyingRef = useRef(false);

  useEffect(() => {
    const root = document.body;
    let timeoutId = null;

    const runTranslation = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isApplyingRef.current) return;
        isApplyingRef.current = true;
        translateDom(root, i18n.language).finally(() => {
          isApplyingRef.current = false;
        });
      }, 50);
    };

    runTranslation();

    const observer = new MutationObserver(() => {
      if (isApplyingRef.current) return;
      runTranslation();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"]
    });

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [i18n.language]);

  return children;
}
