import { create } from 'zustand';

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
    selectedCategory: null,
    searchQuery: '',
    isSearching: false,

    setSearchQuery: (query) => set({ searchQuery: query, isSearching: query.length > 0 }),
    setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId, searchQuery: '', isSearching: false }),
    setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),
    setOrderNote: (note) => set({ orderNote: note }),
    
    initializeOrder: () => set({ 
      currentOrderId: generateOrderId(),
      cart: [],
      customerName: '',
      customerPhone: '',
      orderNote: ''
    }),

    addToCart: (dish, note = '') => {
      const { cart } = get();
      const existingIndex = cart.findIndex(item => item.dishId === dish.id && item.note === note);
      
      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        set({ cart: newCart });
      } else {
        set({
          cart: [...cart, {
            id: `${dish.id}-${Date.now()}`,
            dishId: dish.id,
            name: dish.nameEn,
            price: Number(dish.price),
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
      return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getTax: () => {
      return get().getSubtotal() * 0.05;
    },

    getTotal: () => {
      return get().getSubtotal() + get().getTax();
    }
  }));