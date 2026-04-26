"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AlertCircle, ChevronDown, Clock3, Heart, PencilLine, Store, Trash2, Wallet } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { usePosStore } from "@/modules/pos/pos-store";
import { createOrder } from "@/modules/pos/pos-actions";
import { buildReceiptHtml } from "@/modules/receipts/receipt-renderer";
import { openPrintPreview } from "@/modules/receipts/print-preview";
import { calculateVatInclusiveTotals } from "@/modules/pos/vat";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { formatOrderId } from "@/lib/order-id";
import { useTranslation } from "react-i18next";

const NOOP = () => {};
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "ssl", label: "SSL" },
  { id: "mobile", label: "Mobile Banking" }
];

const BANGLADESH_TIMEZONE = "Asia/Dhaka";

function normalizeCategoryKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
}

function getDefaultCategoryKeyForBangladeshTime() {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: BANGLADESH_TIMEZONE,
    hour: "numeric",
    hour12: false,
    hourCycle: "h23"
  }).format(new Date()));

  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "meal";
  return "dinner";
}

function formatCurrency(value) {
  return `৳${Number(value || 0).toFixed(2)}`;
}

function normalizeCustomerName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeBangladeshPhone(value) {
  const normalizedValue = String(value || "").replace(/[^\d+]/g, "").trim();

  if (!normalizedValue) return "";
  if (normalizedValue.startsWith("+880")) return normalizedValue.slice(4);
  if (normalizedValue.startsWith("880")) return normalizedValue.slice(3);
  if (normalizedValue.startsWith("0")) return normalizedValue.slice(1);
  return normalizedValue;
}

function isValidBangladeshName(value) {
  const normalizedValue = normalizeCustomerName(value);
  if (!normalizedValue) return false;
  if (normalizedValue.length < 2 || normalizedValue.length > 60) return false;
  return /^[A-Za-z\u0980-\u09FF.' ]+$/.test(normalizedValue);
}

function isValidBangladeshPhone(value) {
  const normalizedValue = normalizeBangladeshPhone(value);
  if (!normalizedValue) return false;
  return /^1[3-9]\d{8}$/.test(normalizedValue);
}

function formatBangladeshPhoneForStorage(value) {
  const normalizedValue = normalizeBangladeshPhone(value);
  return normalizedValue ? `+880${normalizedValue}` : "";
}

function printHtmlDirect(html) {
  if (typeof window === "undefined" || !html) return false;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
  };

  const frameDocument = iframe.contentWindow?.document;
  if (!frameDocument) {
    cleanup();
    return false;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    cleanup();
    return false;
  }

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(cleanup, 1000);
  }, 80);

  return true;
}

function useCachedStoreLabels(storeEntries) {
  const { i18n } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [cachedLabels, setCachedLabels] = useState({});
  const pendingLabelsRef = useRef(new Set());

  useEffect(() => {
    if (i18n.language !== "bn") return undefined;

    const uniqueEntries = [];
    const seenNames = new Set();
    for (const entry of storeEntries) {
      const nameEn = String(entry?.nameEn || "").trim();
      if (!nameEn || seenNames.has(nameEn)) continue;
      seenNames.add(nameEn);
      uniqueEntries.push({
        nameEn,
        nameBn: String(entry?.nameBn || "").trim()
      });
    }

    const immediateLabels = {};
    const missingTexts = [];
    for (const entry of uniqueEntries) {
      if (entry.nameBn) {
        immediateLabels[entry.nameEn] = entry.nameBn;
        continue;
      }

      if (cachedLabels[entry.nameEn]) {
        immediateLabels[entry.nameEn] = cachedLabels[entry.nameEn];
        continue;
      }

      const translatedLabel = translateContent(entry.nameEn);
      if (translatedLabel && translatedLabel !== entry.nameEn) {
        immediateLabels[entry.nameEn] = translatedLabel;
        continue;
      }

      if (!pendingLabelsRef.current.has(entry.nameEn)) {
        missingTexts.push(entry.nameEn);
      }
    }

    if (Object.keys(immediateLabels).length > 0) {
      setCachedLabels((current) => {
        const next = { ...current };
        let changed = false;

        for (const [nameEn, label] of Object.entries(immediateLabels)) {
          if (next[nameEn] !== label) {
            next[nameEn] = label;
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }

    const uncachedTexts = [...new Set(missingTexts.filter(Boolean))];
    if (uncachedTexts.length === 0) return undefined;

    uncachedTexts.forEach((text) => pendingLabelsRef.current.add(text));

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/v1/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: uncachedTexts,
            sourceLanguage: "en",
            targetLanguage: "bn"
          })
        });

        if (!response.ok || cancelled) return;

        const data = await response.json();
        const translations = data.translations || {};
        if (cancelled || Object.keys(translations).length === 0) return;

        setCachedLabels((current) => ({ ...current, ...translations }));
      } catch {
        return;
      } finally {
        uncachedTexts.forEach((text) => pendingLabelsRef.current.delete(text));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cachedLabels, i18n.language, storeEntries, translateContent]);

  return useCallback((nameEn, nameBn = "") => {
    const normalizedName = String(nameEn || "").trim();
    if (!normalizedName) return "";

    if (i18n.language !== "bn") {
      return normalizedName;
    }

    return String(nameBn || "").trim() || cachedLabels[normalizedName] || translateContent(normalizedName);
  }, [cachedLabels, i18n.language, translateContent]);
}

function ProductCard({ product, onAddToCart, showStoreName, storeLabel }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [product.imageUrl]);

  const showImage = Boolean(product.imageUrl) && !hasImageError;

  return (
    <article className="group relative rounded-[26px] border border-slate-100 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
      <div className="relative h-28 rounded-[20px] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {showImage ? (
            <img src={product.imageUrl} alt={product.nameEn} onError={() => setHasImageError(true)} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">{product.productType === "stock" ? "📦" : product.category?.icon || "🍽️"}</span>
          )}
        </div>
        <button type="button" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2771cb] shadow-sm transition-transform hover:scale-110">
          <Heart className="h-3.5 w-3.5" />
        </button>
        {product.isLowStock ? (
          <div className="absolute left-2 top-2 rounded-full bg-[#e5f1ff] px-2 py-0.5 text-[10px] font-semibold text-[#13508b]">
            {t("pos.lowStock")}
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-slate-900">{translateContent(product.nameEn)}</h3>
        </div>
        {showStoreName ? <div data-no-translate="true" className="mt-2 text-xs font-medium text-slate-400">{storeLabel}</div> : null}
        <p className="mt-1 min-h-[21px] text-xs leading-[14px] text-slate-500">
          {product.productType === "stock" ? translateContent(product.supplier || "Inventory item") : translateContent(product.category?.nameEn || "")}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" /> {t("pos.inStock", { count: product.stock || 0 })}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[31px] font-black leading-none text-[#2771cb]">{formatCurrency(product.price)}</span>
          <button type="button" onClick={() => onAddToCart(product)} className="rounded-2xl bg-[#2771cb] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#13508b] active:scale-95">
            {t("pos.addToCart")}
          </button>
        </div>
      </div>
    </article>
  );
}

function CartItem({ item, onUpdateQuantity, onRemove, onEditNote, showStoreName, storeLabel }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(item.note || "");
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();

  return (
    <div className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-2xl">{item.name?.charAt(0) || "?"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-slate-800">{translateContent(item.name)}</h4>
              {showStoreName ? <div data-no-translate="true" className="mt-1 text-xs text-slate-400">{storeLabel}</div> : null}
              {item.note ? <p className="mt-1 text-xs leading-5 text-slate-500">{t("pos.note", { note: item.note })}</p> : null}
            </div>
            <div className="flex items-center gap-2 text-[#2771cb]">
              <button type="button" onClick={() => setShowNote(!showNote)} className="hover:opacity-70"><PencilLine className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onRemove(item.id)} className="hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {showNote ? (
            <div className="mt-2 flex gap-2">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pos.addNote")} className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
              <button type="button" onClick={() => { onEditNote(item.id, note); setShowNote(false); }} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white">
                {t("pos.saveNote")}
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[29px] font-black leading-none text-[#2771cb]">{formatCurrency(item.price * item.quantity)}</span>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-300">-</button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-700">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentDetailsModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  onCustomerNameChange,
  onCustomerPhoneChange,
  paymentMethod,
  onPaymentMethodChange,
  splitCount,
  onSplitCountChange,
  amountPaid,
  onAmountPaidChange,
  totals,
  itemCount,
  isProcessing,
  onConfirm
}) {
  const amountPerHead = totals.totalAmount / splitCount;
  const paid = Number(amountPaid || 0);
  const due = Math.max(totals.totalAmount - paid, 0);
  const changeDue = Math.max(paid - totals.totalAmount, 0);
  const normalizedCustomerName = normalizeCustomerName(customerName);
  const normalizedCustomerPhone = normalizeBangladeshPhone(customerPhone);
  const hasName = Boolean(normalizedCustomerName);
  const hasPhone = Boolean(normalizedCustomerPhone);
  const hasValidName = !hasName || isValidBangladeshName(normalizedCustomerName);
  const hasValidPhone = !hasPhone || isValidBangladeshPhone(normalizedCustomerPhone);
  const canConfirm = hasValidName && hasValidPhone;

  return (
    <ModalShell isOpen={isOpen} maxWidthClass="max-w-4xl" onBackdropClick={onClose}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_320px]">
        <div>
          <h3 className="text-3xl font-bold text-[#2f6fc6]">Payment Details</h3>

          <div className="mt-8 space-y-5">
            <div className="grid gap-3 md:grid-cols-[130px_minmax(0,1fr)] md:items-center">
              <label className="text-xl font-medium text-slate-700">Customer Name</label>
              <div>
                <input type="text" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Enter customer name" className={`w-full rounded-xl border px-4 py-3 text-base outline-none ${hasValidName ? "border-slate-200 focus:border-[#2f6fc6]" : "border-red-300 focus:border-red-500"}`} />
                {!hasValidName ? <p className="mt-2 text-xs text-red-500">Use a real name with Bangla or English letters only.</p> : null}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[130px_minmax(0,1fr)] md:items-center">
              <label className="text-xl font-medium text-slate-700">Contact Number</label>
              <div>
                <div className={`flex items-center rounded-xl border bg-white ${hasValidPhone ? "border-slate-200 focus-within:border-[#2f6fc6]" : "border-red-300 focus-within:border-red-500"}`}>
                  <span className="rounded-l-xl bg-slate-50 px-4 py-3 text-base font-medium text-slate-500">+880</span>
                  <input type="tel" inputMode="numeric" value={normalizedCustomerPhone} onChange={(event) => onCustomerPhoneChange(normalizeBangladeshPhone(event.target.value))} placeholder="1712345678" className="w-full rounded-r-xl border-0 px-4 py-3 text-base outline-none placeholder:text-slate-400" />
                </div>
                {!hasValidPhone ? <p className="mt-2 text-xs text-red-500">Use a valid Bangladesh number like `01XXXXXXXXX` or `+8801XXXXXXXXX`.</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.id)}
                  className={`flex w-full max-w-[220px] items-center gap-3 rounded-2xl px-5 py-4 text-left text-lg font-medium transition-colors ${active ? "bg-[#2f6fc6] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <Wallet className="h-5 w-5" />
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-end">
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Split by:</span>
              <select value={splitCount} onChange={(event) => onSplitCountChange(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#2f6fc6]">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count} person</option>
                ))}
              </select>
            </label>
            <div className="text-sm font-semibold text-slate-700">
              <div className="mb-2">Amount per head:</div>
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-right text-lg font-bold text-slate-900">{formatCurrency(amountPerHead)}</div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#9bc1ff] bg-white">
            <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Total Items</span><span className="font-semibold text-slate-900">{itemCount}</span></div>
              <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-slate-900">{formatCurrency(totals.subtotalAmount)}</span></div>
              <div className="flex items-center justify-between"><span>Included VAT</span><span className="font-semibold text-slate-900">{formatCurrency(totals.vatAmount)}</span></div>
              <div className="flex items-center justify-between"><span>Items Total</span><span className="font-semibold text-slate-900">{formatCurrency(totals.grossAmount)}</span></div>
            </div>
            <div className="border-t border-[#9bc1ff] px-5 py-4">
              <div className="flex items-center justify-between text-3xl font-bold text-slate-900">
                <span>Total:</span>
                <span>{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3">
                <div className="font-medium text-emerald-600">{paymentMethod === "cash" ? "Cash Received" : paymentMethod === "ssl" ? "SSL Payment" : "Mobile Payment"}</div>
                <input type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => onAmountPaidChange(event.target.value)} className="w-full rounded-none border border-[#f7c8a8] px-3 py-2 text-right outline-none focus:border-[#2f6fc6]" />
              </div>
              <div className="flex items-center justify-between text-sm"><span className="text-[#13508b]">Due</span><span className="font-semibold text-slate-900">{formatCurrency(due)}</span></div>
              <div className="flex items-center justify-between text-3xl font-bold text-slate-900"><span>Change Due</span><span>{formatCurrency(changeDue)}</span></div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button type="button" onClick={onConfirm} disabled={isProcessing || !canConfirm} className="w-full rounded-2xl bg-[#2f6fc6] px-5 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#255ca8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
              {isProcessing ? "Processing..." : "Complete Order & Print"}
            </button>
            {(!hasValidName || !hasValidPhone) ? <p className="text-sm text-amber-600">Fix the invalid customer information before completing the order.</p> : null}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function PosClient({ categories, products, storeId, userEmail, store: storeDetails, stores = [], activeStoreId = null }) {
  const store = usePosStore();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  const defaultCategoryScopeRef = useRef(null);

  const cart = useMemo(() => store?.cart || [], [store?.cart]);
  const currentOrderId = store?.currentOrderId || null;
  const customerName = store?.customerName || "";
  const customerPhone = store?.customerPhone || "";
  const selectedCategory = store?.selectedCategory || null;
  const searchQuery = store?.searchQuery || "";
  const isSearching = store?.isSearching || false;

  const setSearchQuery = store?.setSearchQuery || NOOP;
  const setSelectedCategory = store?.setSelectedCategory || NOOP;
  const initializeOrder = store?.initializeOrder || NOOP;
  const addToCart = store?.addToCart || NOOP;
  const updateQuantity = store?.updateQuantity || NOOP;
  const removeFromCart = store?.removeFromCart || NOOP;
  const updateItemNote = store?.updateItemNote || NOOP;
  const clearCart = store?.clearCart || NOOP;
  const setCustomerInfo = store?.setCustomerInfo || NOOP;
  const getSubtotal = store?.getSubtotal || (() => 0);
  const getTax = store?.getTax || (() => 0);
  const getTotal = store?.getTotal || (() => 0);
  const setVatPercentage = store?.setVatPercentage || NOOP;

  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState(activeStoreId || "all");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitCount, setSplitCount] = useState(1);
  const [amountPaid, setAmountPaid] = useState("0");
  const [cartNotice, setCartNotice] = useState("");
  
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const storeLabelEntries = useMemo(() => [
    ...(storeDetails?.nameEn ? [{ nameEn: storeDetails.nameEn, nameBn: storeDetails.nameBn }] : []),
    ...stores.map((entry) => ({ nameEn: entry.nameEn, nameBn: entry.nameBn })),
    ...categories.map((category) => ({ nameEn: category.store?.nameEn, nameBn: category.store?.nameBn })),
    ...products.map((product) => ({ nameEn: product.storeName, nameBn: product.storeNameBn })),
    ...cart.map((item) => ({ nameEn: item.storeName, nameBn: item.storeNameBn }))
  ], [cart, categories, products, storeDetails, stores]);
  const getStoreLabel = useCachedStoreLabels(storeLabelEntries);

  const initOrder = useCallback(() => {
    if (!currentOrderId && initializeOrder) {
      initializeOrder();
    }
  }, [currentOrderId, initializeOrder]);

  useEffect(() => {
    initOrder();
  }, [initOrder]);

  useEffect(() => {
    if (activeStoreId) {
      setSelectedStoreFilter(activeStoreId);
    }
  }, [activeStoreId]);

  const cartStoreId = cart[0]?.storeId || storeId || null;
  const cartStoreName = getStoreLabel(cart[0]?.storeName || storeDetails?.nameEn || "", cart[0]?.storeNameBn || storeDetails?.nameBn || "");
  const cartVatPercentage = cart[0]?.storeVatPercentage ?? storeDetails?.vatPercentage ?? 0;
  const showStoreNames = !activeStoreId;
  const pageStoreName = storeDetails?.nameEn
    ? getStoreLabel(storeDetails.nameEn, storeDetails.nameBn)
    : t("header.allStores");

  useEffect(() => {
    setVatPercentage(cartVatPercentage || 0);
  }, [cartVatPercentage, setVatPercentage]);

  const filteredByStoreProducts = useMemo(() => {
    if (selectedStoreFilter === "all") return products;
    return products.filter((product) => product.storeId === selectedStoreFilter);
  }, [products, selectedStoreFilter]);

  const visibleCategories = useMemo(() => {
    return categories.filter((category) => selectedStoreFilter === "all" || category.storeId === selectedStoreFilter);
  }, [categories, selectedStoreFilter]);

  useEffect(() => {
    const scopedCategories = categories.filter((category) => selectedStoreFilter === "all" || category.storeId === selectedStoreFilter);

    if (selectedStoreFilter === "all") {
      defaultCategoryScopeRef.current = selectedStoreFilter;
      return;
    }

    if (defaultCategoryScopeRef.current === selectedStoreFilter) {
      return;
    }

    defaultCategoryScopeRef.current = selectedStoreFilter;

    if (selectedCategory === "__inventory__" || scopedCategories.some((category) => category.id === selectedCategory)) {
      return;
    }

    const defaultCategoryKey = getDefaultCategoryKeyForBangladeshTime();
    const defaultCategory = scopedCategories.find((category) => normalizeCategoryKey(category.nameEn) === defaultCategoryKey);

    if (defaultCategory) {
      setSelectedCategory(defaultCategory.id);
    }
  }, [categories, selectedCategory, selectedStoreFilter, setSelectedCategory]);

  const suggestionProducts = useMemo(() => {
    if (isSearching && searchQuery) {
      return filteredByStoreProducts.filter((product) => product.nameEn.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return [];
  }, [filteredByStoreProducts, isSearching, searchQuery]);

  const filteredProducts = useMemo(() => {
    let nextProducts = filteredByStoreProducts;

    if (submittedSearch) {
      nextProducts = nextProducts.filter((product) => product.nameEn.toLowerCase().includes(submittedSearch.toLowerCase()));
    }

    if (selectedCategory) {
      nextProducts = nextProducts.filter((product) => product.categoryId === selectedCategory);
    }

    return nextProducts;
  }, [filteredByStoreProducts, selectedCategory, submittedSearch]);

  const lowStockItems = useMemo(() => filteredByStoreProducts.filter((product) => product.isLowStock), [filteredByStoreProducts]);
  const grossCartAmount = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0), [cart]);
  const vatBreakdown = useMemo(() => calculateVatInclusiveTotals(grossCartAmount, cartVatPercentage || 0), [cartVatPercentage, grossCartAmount]);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [cart]);

  useEffect(() => {
    if (isCheckoutOpen) {
      setAmountPaid(String(vatBreakdown.totalAmount.toFixed(2)));
    }
  }, [isCheckoutOpen, vatBreakdown.totalAmount]);

  const allCategories = useMemo(() => [...visibleCategories, { id: "__inventory__", nameEn: "Inventory" }, { id: null, nameEn: "All" }], [visibleCategories]);

  function handleAddToCart(product) {
    if (cart.length > 0 && cartStoreId && cartStoreId !== product.storeId) {
      setCartNotice(`Cart is locked to ${cartStoreName}. Reset the cart to add items from ${getStoreLabel(product.storeName, product.storeNameBn)}.`);
      return;
    }

    setCartNotice("");
    setVatPercentage(product.storeVatPercentage || 0);
    addToCart(product);
  }

  async function handleCheckoutConfirm() {
    if (cart.length === 0) return;

    const normalizedCustomerName = normalizeCustomerName(customerName);
    const normalizedCustomerPhone = normalizeBangladeshPhone(customerPhone);

    if (normalizedCustomerName && !isValidBangladeshName(normalizedCustomerName)) {
      showToast("Enter a valid customer name using Bangla or English letters.", "error");
      return;
    }

    if (normalizedCustomerPhone && !isValidBangladeshPhone(normalizedCustomerPhone)) {
      showToast("Enter a valid Bangladesh phone number.", "error");
      return;
    }

    const checkoutStoreId = cartStoreId || selectedStoreFilter;
    if (!checkoutStoreId || checkoutStoreId === "all") {
      setCartNotice("Select a store or add items from a single store before checkout.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createOrder(checkoutStoreId, {
        customerName: normalizedCustomerName || null,
        customerPhone: formatBangladeshPhoneForStorage(normalizedCustomerPhone) || null,
        paymentMethod,
        splitCount,
        amountPaid: Number(amountPaid || 0),
        items: cart.map((item) => ({
          productId: item.productId,
          productType: item.productType,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          note: item.note
        })),
        subtotal: getSubtotal(),
        tax: getTax(),
        total: getTotal()
      });

      const receiptPaperWidth = result.store?.receiptPaperWidth || "58mm";
      const receiptHtml = buildReceiptHtml(result, t, (item) => item.itemName || "Item", {
        paperWidthOverride: receiptPaperWidth
      });
      printHtmlDirect(receiptHtml);

      showToast(`Order placed successfully!\nInvoice: ${formatOrderId(result.invoiceNumber) || "----"}`, "success");
      setIsCheckoutOpen(false);
      clearCart();
      initializeOrder();
      setCartNotice("");
    } catch (error) {
      console.error("Checkout error:", error);
      showToast("Failed to place order. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    if (confirm("Are you sure you want to reset the cart?")) {
      clearCart();
      initializeOrder();
      setCartNotice("");
    }
  }

  function handlePrintSlip() {
    if (cart.length === 0) return;

    const previewStore = {
      ...(storeDetails || {}),
      nameEn: cartStoreName || storeDetails?.nameEn || "Store",
      vatPercentage: cartVatPercentage || 0,
      terminals: storeDetails?.terminals || []
    };
    const draftOrder = {
      invoiceNumber: currentOrderId || `DRAFT-${Date.now().toString(36).toUpperCase()}`,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      subtotalAmount: vatBreakdown.subtotalAmount,
      vatAmount: vatBreakdown.vatAmount,
      vatPercentage: cartVatPercentage || 0,
      vatNumber: previewStore.vatNumber || null,
      totalAmount: vatBreakdown.totalAmount,
      store: previewStore,
      items: cart.map((item) => ({
        id: item.id,
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        note: item.note || ""
      }))
    };

    const popup = openPrintPreview({
      title: `Order Slip ${formatOrderId(draftOrder.invoiceNumber) || "----"}`,
      defaultPaperWidth: previewStore.receiptPaperWidth || "58mm",
      printers: previewStore.terminals || [],
      previews: {
        "58mm": buildReceiptHtml(draftOrder, t, (item) => item.itemName || "Item", { paperWidthOverride: "58mm" }),
        "80mm": buildReceiptHtml(draftOrder, t, (item) => item.itemName || "Item", { paperWidthOverride: "80mm" })
      }
    });

    if (!popup) {
      showToast("Popup was blocked. Please allow popups and try again.", "error");
    }
  }

  return (
    <>
      {toastMessage ? (
        <div className={`fixed leading-tight text-center left-1/2 top-6 z-[100] max-w-sm -translate-x-1/2 whitespace-pre-wrap rounded-[24px] px-6 py-4 text-[15px] font-semibold flex items-center justify-center shadow-[0_30px_60px_rgba(15,23,42,0.2)] transition-all ${toastType === "error" ? "bg-[#fff1f2] text-[#e11d48] border border-[#ffe4e6]" : "bg-[#e5f1ff] text-[#2771cb] border border-[#cbe3ff]"}`}>
          {toastMessage}
        </div>
      ) : null}

      <PaymentDetailsModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        customerName={customerName}
        customerPhone={customerPhone}
        onCustomerNameChange={(value) => setCustomerInfo(value, customerPhone)}
        onCustomerPhoneChange={(value) => setCustomerInfo(customerName, value)}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        splitCount={splitCount}
        onSplitCountChange={setSplitCount}
        amountPaid={amountPaid}
        onAmountPaidChange={setAmountPaid}
        totals={vatBreakdown}
        itemCount={cartItemCount}
        isProcessing={isProcessing}
        onConfirm={handleCheckoutConfirm}
      />

      <div className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5 rounded-[30px] bg-[#f8f8f8] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[26px] font-bold text-slate-900">{t("pos.title")}</div>
                <div data-no-translate="true" className="mt-1 text-sm text-slate-500">{pageStoreName}</div>
              </div>
              <div className="relative z-40 flex w-full max-w-[620px] items-center gap-3 xl:mr-[390px]">
                <div className="flex h-14 flex-1 items-center rounded-2xl bg-white px-5 shadow-sm">
                  <input
                    type="text"
                    placeholder={t("common.searchMenusOrders")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSubmittedSearch(searchQuery);
                      }
                    }}
                    className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                {showStoreNames ? (
                  <div data-no-translate="true" className="flex h-14 items-center rounded-2xl bg-white px-4 shadow-sm">
                    <Store className="mr-2 h-4 w-4 text-slate-400" />
                    <select value={selectedStoreFilter} onChange={(event) => setSelectedStoreFilter(event.target.value)} className="bg-transparent text-sm text-slate-700 outline-none">
                      <option value="all">{t("header.allStores")}</option>
                      {stores.map((entry) => (
                        <option key={entry.id} value={entry.id}>{getStoreLabel(entry.nameEn, entry.nameBn)}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <button type="button" onClick={() => setSubmittedSearch(searchQuery)} className="shrink-0 rounded-2xl bg-[#2771cb] px-6 py-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#13508b]">
                  Search
                </button>

                {searchQuery && suggestionProducts.length > 0 ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] w-full overflow-hidden rounded-[20px] border border-slate-100 bg-white py-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                    <div className="flex max-h-[360px] flex-col overflow-y-auto">
                      {suggestionProducts.slice(0, 5).map((product) => (
                        <div key={product.id} className="flex cursor-pointer items-start gap-4 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 last:border-b-0" onClick={() => { handleAddToCart(product); setSearchQuery(""); }}>
                          <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-200" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <h4 className="text-[17px] font-semibold text-slate-900">{translateContent(product.nameEn)}</h4>
                            {showStoreNames ? <div data-no-translate="true" className="mt-0.5 text-xs text-slate-400">{getStoreLabel(product.storeName, product.storeNameBn)}</div> : null}
                            <p className="mt-0.5 truncate text-[14px] text-slate-500">{product.productType === "stock" ? translateContent(product.supplier || "Inventory item") : translateContent(product.category?.nameEn || t("common.dish"))}</p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[16px] font-bold text-slate-900">{formatCurrency(product.price)}</span>
                              <span className="text-[13px] text-[#2771cb]">{product.stock > 0 ? t("pos.leftInStock", { count: product.stock }) : t("pos.outOfStock")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
              {allCategories.map((cat) => {
                const isActive = selectedCategory === cat.id || (cat.id === null && selectedCategory === null);
                const categoryStoreName = getStoreLabel(cat.store?.nameEn || "", cat.store?.nameBn || "");

                return (
                  <button key={cat.id || "all"} type="button" onClick={() => setSelectedCategory(cat.id)} className={isActive ? "rounded-xl bg-[#2771cb] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"}>
                    <div>{translateContent(cat.nameEn)}</div>
                    {showStoreNames && categoryStoreName ? <div data-no-translate="true" className={`text-[10px] ${isActive ? "text-[#e5f1ff]" : "text-slate-400"}`}>{categoryStoreName}</div> : null}
                  </button>
                );
              })}
            </div>

            {lowStockItems.length > 0 ? (
              <div className="flex items-center justify-between rounded-2xl border border-[#e5f1ff] bg-[#e5f1ff] px-4 py-3 text-sm text-[#13508b]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{t("pos.productsRunningLow", { count: lowStockItems.length })}</span>
                </div>
                <button type="button" className="font-semibold underline">{t("pos.addStock")}</button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} showStoreName={showStoreNames} storeLabel={getStoreLabel(product.storeName, product.storeNameBn)} />)}
              {filteredProducts.length === 0 ? <div className="col-span-full py-12 text-center text-slate-500">{t("pos.noProductsFound")}</div> : null}
            </div>
          </section>

          <aside className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col rounded-[26px] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[28px] font-black leading-none text-[#2771cb]">{t("pos.customerOrder")}</div>
                {cartStoreName ? <div data-no-translate="true" className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Cart store {cartStoreName}</div> : null}
              </div>
            </div>

            {cartNotice ? <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{cartNotice}</div> : null}

            <div className="flex-1 space-y-5 overflow-y-auto border-t border-slate-100 pt-4">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400">{t("pos.noItemsInCart")}</div>
              ) : (
                cart.map((item) => <CartItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onEditNote={updateItemNote} showStoreName={showStoreNames} storeLabel={getStoreLabel(item.storeName, item.storeNameBn)} />)
              )}
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Items Total</span><span className="font-medium text-slate-800">{formatCurrency(vatBreakdown.grossAmount)}</span></div>
              <div className="flex items-center justify-between"><span>Less Included VAT</span><span className="font-medium text-slate-800">-{formatCurrency(vatBreakdown.vatAmount)}</span></div>
              <div className="flex items-center justify-between"><span>{t("pos.subtotal")}</span><span className="font-medium text-slate-800">{formatCurrency(getSubtotal())}</span></div>
              <div className="flex items-center justify-between"><span>{`VAT (${Number(cartVatPercentage || 0).toFixed(2)}%)`}</span><span className="font-medium text-slate-800">{formatCurrency(getTax())}</span></div>
              <div className="flex items-center justify-between pt-2 text-[18px] font-black text-slate-900"><span>{t("pos.total")}</span><span>{formatCurrency(getTotal())}</span></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0 || isProcessing} className="rounded-2xl bg-[#2771cb] px-4 py-4 text-sm font-semibold text-white hover:bg-[#13508b] disabled:cursor-not-allowed disabled:opacity-50">
                {isProcessing ? t("common.processing") : t("pos.checkout")}
              </button>
              <button type="button" onClick={handleReset} disabled={cart.length === 0} className="rounded-2xl border border-[#2771cb] bg-white px-4 py-4 text-sm font-semibold text-[#2771cb] hover:bg-[#e5f1ff] disabled:opacity-50">
                {t("pos.reset")}
              </button>
            </div>
            <button type="button" onClick={handlePrintSlip} disabled={cart.length === 0} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {t("pos.printOrderSlip")}
            </button>
          </aside>
        </div>
      </div>
    </>
  );
}
