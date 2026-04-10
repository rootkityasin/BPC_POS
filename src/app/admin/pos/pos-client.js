"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertCircle,
  ChevronDown,
  Clock3,
  Heart,
  PencilLine,
  Trash2,
} from "lucide-react";
import { usePosStore } from "@/modules/pos/pos-store";
import { createOrder } from "@/modules/pos/pos-actions";
import { useTranslatedContent } from "@/modules/i18n/use-translated-content";
import { useTranslation } from "react-i18next";

const NOOP = () => {};

function formatCurrency(value) {
  return `৳${Number(value || 0).toFixed(2)}`;
}

function ProductCard({ product, onAddToCart }) {
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();

  return (
    <article className="group relative rounded-[26px] border border-slate-100 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
      <div className="relative h-28 rounded-[20px] bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">{product.productType === "stock" ? "📦" : product.category?.icon || "🍽️"}</span>
        </div>
        <button
          type="button"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#ff242d] shadow-sm transition-transform hover:scale-110"
        >
          <Heart className="h-3.5 w-3.5" />
        </button>
        {product.isLowStock && (
          <div className="absolute left-2 top-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            {t("pos.lowStock")}
          </div>
        )}
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-slate-900">{translateContent(product.nameEn)}</h3>
        </div>
        <p className="mt-2 min-h-[21px] text-xs leading-[14px] text-slate-500">
          {product.productType === "stock" ? translateContent(product.supplier || "Inventory item") : translateContent(product.category?.nameEn || "")}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" /> {t("pos.inStock", { count: product.stock || 0 })}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[31px] font-black leading-none text-[#ff242d]">
            {formatCurrency(product.price)}
          </span>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="rounded-2xl bg-[#ff242d] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ea1d26] active:scale-95"
          >
            {t("pos.addToCart")}
          </button>
        </div>
      </div>
    </article>
  );
}

function CartItem({ item, onUpdateQuantity, onRemove, onEditNote }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(item.note || "");
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();

  return (
    <div className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-md bg-slate-100 flex items-center justify-center text-2xl">
          {item.name?.charAt(0) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
                <h4 className="text-sm font-medium text-slate-800">{translateContent(item.name)}</h4>
              {item.note && (
                <p className="mt-1 text-xs leading-5 text-slate-500">{t("pos.note", { note: item.note })}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-[#ff242d]">
              <button type="button" onClick={() => setShowNote(!showNote)} className="hover:opacity-70">
                <PencilLine className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onRemove(item.id)} className="hover:opacity-70">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          
          {showNote && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("pos.addNote")}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => { onEditNote(item.id, note); setShowNote(false); }}
                className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-white"
              >
                {t("pos.saveNote")}
              </button>
            </div>
          )}
          
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[29px] font-black leading-none text-[#ff242d]">
              {formatCurrency(item.price * item.quantity)}
            </span>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-300"
              >
                -
              </button>
              <span className="w-6 text-center font-semibold">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PosClient({ categories, products, storeId, userEmail, store: storeDetails }) {
  const store = usePosStore();
  const { t } = useTranslation();
  const { translateContent } = useTranslatedContent();
  
  const cart = store?.cart || [];
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

  const initOrder = useCallback(() => {
    if (!currentOrderId && initializeOrder) {
      initializeOrder();
    }
  }, [currentOrderId, initializeOrder]);

  useEffect(() => {
    initOrder();
  }, [initOrder]);

  useEffect(() => {
    setVatPercentage(storeDetails?.vatPercentage || 0);
  }, [setVatPercentage, storeDetails?.vatPercentage]);

  const suggestionProducts = useMemo(() => {
    if (isSearching && searchQuery) {
      return products.filter((product) => 
        product.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return [];
  }, [products, searchQuery, isSearching]);

  const filteredProducts = useMemo(() => {
    if (submittedSearch) {
      return products.filter((product) => 
        product.nameEn.toLowerCase().includes(submittedSearch.toLowerCase())
      );
    }
    if (selectedCategory) {
      return products.filter((product) => product.categoryId === selectedCategory);
    }
    return products;
  }, [products, selectedCategory, submittedSearch]);

  const lowStockItems = useMemo(() => products.filter((product) => product.isLowStock), [products]);

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      const orderData = {
        customerName,
        customerPhone,
        items: cart.map(item => ({
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
      };

      const result = await createOrder(storeId, orderData);
      
      alert(`Order placed successfully!\nInvoice: ${result.invoiceNumber}`);
      clearCart();
      initializeOrder();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the cart?")) {
      clearCart();
      initializeOrder();
    }
  };

  const allCategories = useMemo(
    () => [
      { id: null, nameEn: "All" },
      ...categories,
      { id: "__inventory__", nameEn: "Inventory" }
    ],
    [categories]
  );

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5 rounded-[30px] bg-[#f8f8f8] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[26px] font-bold text-slate-900">{t("pos.title")}</div>
              <div className="mt-1 text-sm text-slate-500">{storeDetails?.nameEn || userEmail}</div>
            </div>
            <div className="relative z-50 flex w-full max-w-[540px] items-center gap-3">
              <div className="flex h-14 flex-1 items-center rounded-2xl bg-white px-5 shadow-sm">
                <input
                  type="text"
                  placeholder={t("common.searchMenusOrders")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSubmittedSearch(searchQuery);
                    }
                  }}
                  className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setSubmittedSearch(searchQuery)}
                className="rounded-2xl bg-[#ff242d] px-8 py-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#ea1d26]"
              >
                Search
              </button>

              {searchQuery && suggestionProducts.length > 0 && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-full overflow-hidden rounded-[20px] bg-white py-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-100">
                  <div className="flex max-h-[360px] flex-col overflow-y-auto">
                    {suggestionProducts.slice(0, 5).map((product) => (
                       <div
                         key={product.id}
                         className="flex cursor-pointer items-start gap-4 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 last:border-b-0"
                         onClick={() => {
                           handleAddToCart(product);
                           setSearchQuery('');
                         }}
                       >
                         <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-200"></div>
                         <div className="flex min-w-0 flex-1 flex-col">
                            <h4 className="text-[17px] font-semibold text-slate-900">{translateContent(product.nameEn)}</h4>
                            <p className="mt-0.5 truncate text-[14px] text-slate-500">
                              {product.productType === "stock" ? translateContent(product.supplier || "Inventory item") : translateContent(product.category?.nameEn || t("common.dish"))}
                            </p>
                           <div className="mt-1.5 flex items-center justify-between">
                             <span className="text-[16px] font-bold text-slate-900">{formatCurrency(product.price)}</span>
                             <span className="text-[13px] text-[#ff242d]">
                                {product.stock > 0 ? t("pos.leftInStock", { count: product.stock }) : t("pos.outOfStock")}
                             </span>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
            {allCategories.map((cat) => {
              const isActive = selectedCategory === cat.id || (cat.id === null && selectedCategory === null);
              return (
                <button
                  key={cat.id || "all"}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={
                    isActive
                      ? "rounded-xl bg-[#ff242d] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
                  }
                >
                  {translateContent(cat.nameEn)}
                </button>
              );
            })}
          </div>

          {lowStockItems.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-[#ffc8cb] bg-[#ffdfe1] px-4 py-3 text-sm text-[#f13b45]">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                   {t("pos.productsRunningLow", { count: lowStockItems.length })}
                 </span>
               </div>
               <button type="button" className="font-semibold underline">
                 {t("pos.addStock")}
               </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                {t("pos.noProductsFound")}
              </div>
            )}
          </div>
        </section>

        <aside className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col rounded-[26px] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[28px] font-black leading-none text-[#ff242d]">{t("pos.customerOrder")}</div>
              <div className="mt-2 text-sm text-slate-500">{t("pos.orderNo", { id: currentOrderId || "---" })}</div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-500" />
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto border-t border-slate-100 pt-4">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label htmlFor="customer-name" className="mb-2 block text-sm font-medium text-slate-700">{t("pos.customerName")}</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerInfo(event.target.value, customerPhone)}
                  placeholder={t("pos.customerNamePlaceholder")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#ff242d]"
                />
              </div>
              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-sm font-medium text-slate-700">{t("pos.customerPhone")}</label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerInfo(customerName, event.target.value)}
                  placeholder={t("pos.customerPhonePlaceholder")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#ff242d]"
                />
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                {t("pos.noItemsInCart")}
              </div>
            ) : (
              cart.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onEditNote={updateItemNote}
                />
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>{t("pos.subtotal")}</span>
              <span className="font-medium text-slate-800">{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{`VAT (${Number(storeDetails?.vatPercentage || 0).toFixed(2)}%)`}</span>
              <span className="font-medium text-slate-800">{formatCurrency(getTax())}</span>
            </div>
            <div className="flex items-center justify-between pt-2 text-[18px] font-black text-slate-900">
              <span>{t("pos.total")}</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="rounded-2xl bg-[#ff242d] px-4 py-4 text-sm font-semibold text-white hover:bg-[#ea1d26] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? t("common.processing") : t("pos.checkout")}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={cart.length === 0}
              className="rounded-2xl border border-[#ff242d] bg-white px-4 py-4 text-sm font-semibold text-[#ff242d] hover:bg-red-50 disabled:opacity-50"
            >
               {t("pos.reset")}
            </button>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {t("pos.printOrderSlip")}
          </button>
        </aside>
      </div>
    </div>
  );
}
