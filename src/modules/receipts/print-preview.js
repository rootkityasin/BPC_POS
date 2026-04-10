"use client";

const STORAGE_PREFIX = "bpc-print-preview:";
const callbackRegistry = new Map();

if (typeof window !== "undefined" && !window.__bpcPrintPreviewListenerAttached) {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== "bpc-print-confirmed") return;

    const callback = callbackRegistry.get(event.data.key);
    if (callback) {
      callback();
    }
  });

  window.__bpcPrintPreviewListenerAttached = true;
}

function createPreviewKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function openPrintPreview(payload, options = {}) {
  const key = createPreviewKey();
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));

  if (typeof options.onPrint === "function") {
    callbackRegistry.set(key, () => {
      options.onPrint();
      callbackRegistry.delete(key);
    });
  }

  const popup = window.open(`/print-preview?key=${encodeURIComponent(key)}`, "_blank", "width=1280,height=900,resizable=yes,scrollbars=yes");
  if (!popup) {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    callbackRegistry.delete(key);
  }

  return popup;
}

export function readPrintPreviewPayload(key) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
