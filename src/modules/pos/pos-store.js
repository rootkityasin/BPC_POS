import { create } from 'zustand';
import { calculateVatInclusiveTotals } from '@/modules/pos/vat';

function generateOrderId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
}

export const usePosStore = create((set, get) => ({
    cart: [],
    currentOrderId: null,
    customerName: '',
    customerPhone: '',
    orderNote: '',
    vatPercentage: 0,
    selectedCategory: null,
    searchQuery: '',
    isSearching: false,

    setSearchQuery: (query) => set({ searchQuery: query, isSearching: query.length > 0 }),
    setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId, searchQuery: '', isSearching: false }),
    setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),
    setOrderNote: (note) => set({ orderNote: note }),
    setVatPercentage: (vatPercentage) => set({ vatPercentage: Number(vatPercentage) || 0 }),
    
    initializeOrder: () => set({ 
      currentOrderId: generateOrderId(),
      cart: [],
      customerName: '',
      customerPhone: '',
      orderNote: ''
    }),

    addToCart: (product, note = '') => {
      const { cart } = get();
      const existingIndex = cart.findIndex(
        (item) => item.productId === product.productId && item.productType === product.productType && item.note === note
      );
      
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        set({ cart: newCart });
      } else {
        set({
          cart: [...cart, {
            id: `${product.productType}-${product.productId}-${Date.now()}`,
            productId: product.productId,
            productType: product.productType,
            name: product.nameEn,
            price: Number(product.price),
            storeId: product.storeId || null,
            storeName: product.storeName || "",
            storeVatPercentage: Number(product.storeVatPercentage || 0),
            quantity: 1,
            note
          }]
        });
      }
    },

    updateQuantity: (itemId, quantity) => {
      const { cart } = get();
      if (quantity <= 0) {
        set({ cart: cart.filter(item => item.id !== itemId) });
      } else {
        set({
          cart: cart.map(item => item.id === itemId ? { ...item, quantity } : item)
        });
      }
    },

    removeFromCart: (itemId) => {
      const { cart } = get();
      set({ cart: cart.filter(item => item.id !== itemId) });
    },

    updateItemNote: (itemId, note) => {
      const { cart } = get();
      set({
        cart: cart.map(item => item.id === itemId ? { ...item, note } : item)
      });
    },

    clearCart: () => set({ 
      cart: [],
      customerName: '',
      customerPhone: '',
      orderNote: '',
      currentOrderId: null
    }),

    getSubtotal: () => {
      const { cart } = get();
      const gross = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return calculateVatInclusiveTotals(gross, get().vatPercentage).subtotalAmount;
    },

    getTax: () => {
      const { cart, vatPercentage } = get();
      const gross = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return calculateVatInclusiveTotals(gross, vatPercentage).vatAmount;
    },

    getTotal: () => {
      const { cart, vatPercentage } = get();
      const gross = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return calculateVatInclusiveTotals(gross, vatPercentage).totalAmount;
    }
  }));
