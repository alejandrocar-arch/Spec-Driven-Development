/**
 * Zustand store for the POS Frontend application.
 * Manages all application state including cart, products, transactions, and connectivity.
 */

import { create } from 'zustand';
import type { POSStore, Product, CartItem, Discount, Payment, Transaction } from '../types';
import { backupCartState } from '../services/init/appInitializer';

/** Generate a simple UUID */
function generateId(): string {
  return crypto.randomUUID();
}

export const usePOSStore = create<POSStore>((set, get) => ({
  // Initial state
  products: [],
  productIndex: new Map(),
  lastSync: null,
  cart: [],
  cartDiscounts: [],
  transactions: [],
  currentTransaction: null,
  isOnline: navigator.onLine,
  isSyncing: false,
  error: null,

  // Cart actions
  addToCart: (product: Product, quantity = 1) => {
    const { cart, cartDiscounts } = get();
    const existing = cart.find((item) => item.product.id === product.id);

    let updatedCart: CartItem[];
    if (existing) {
      updatedCart = cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity, lineTotal: product.price * (item.quantity + quantity) }
          : item
      );
    } else {
      const newItem: CartItem = {
        id: generateId(),
        product,
        quantity,
        lineTotal: product.price * quantity,
      };
      updatedCart = [...cart, newItem];
    }
    
    set({ cart: updatedCart });
    backupCartState(updatedCart, cartDiscounts);
  },

  updateQuantity: (itemId: string, quantity: number) => {
    const { cart, cartDiscounts } = get();
    let updatedCart: CartItem[];
    if (quantity <= 0) {
      updatedCart = cart.filter((item) => item.id !== itemId);
    } else {
      updatedCart = cart.map((item) =>
        item.id === itemId
          ? { ...item, quantity, lineTotal: item.product.price * quantity }
          : item
      );
    }
    set({ cart: updatedCart });
    backupCartState(updatedCart, cartDiscounts);
  },

  removeFromCart: (itemId: string) => {
    const { cart, cartDiscounts } = get();
    const updatedCart = cart.filter((item) => item.id !== itemId);
    set({ cart: updatedCart });
    backupCartState(updatedCart, cartDiscounts);
  },

  applyDiscount: (discount: Discount) => {
    const { cart, cartDiscounts } = get();
    let updatedCart = cart;
    let updatedDiscounts = cartDiscounts;
    
    if (discount.target === 'cart') {
      updatedDiscounts = [...cartDiscounts, discount];
      set({ cartDiscounts: updatedDiscounts });
    } else {
      updatedCart = cart.map((item) =>
        item.id === discount.targetItemId ? { ...item, itemDiscount: discount } : item
      );
      set({ cart: updatedCart });
    }
    backupCartState(updatedCart, updatedDiscounts);
  },

  removeDiscount: (discountId: string) => {
    const { cart, cartDiscounts } = get();
    const updatedDiscounts = cartDiscounts.filter((d) => d.id !== discountId);
    const updatedCart = cart.map((item) =>
      item.itemDiscount?.id === discountId ? { ...item, itemDiscount: undefined } : item
    );
    set({
      cartDiscounts: updatedDiscounts,
      cart: updatedCart,
    });
    backupCartState(updatedCart, updatedDiscounts);
  },

  clearCart: () => {
    set({ cart: [], cartDiscounts: [] });
    backupCartState([], []);
  },

  checkout: async (payment: Payment): Promise<Transaction> => {
    const { cart, cartDiscounts } = get();
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const cartDiscount = cartDiscounts.reduce((sum, d) => {
      if (d.type === 'percentage') return sum + Math.round(subtotal * (d.value / 100));
      return sum + d.value;
    }, 0);
    const taxAmount = cart.reduce((sum, item) => {
      const taxable = item.lineTotal * (1 - cartDiscount / (subtotal || 1));
      return sum + Math.round(taxable * item.product.taxRate);
    }, 0);
    const total = subtotal - cartDiscount + taxAmount;

    const transaction: Transaction = {
      id: generateId(),
      timestamp: Date.now(),
      items: [...cart],
      subtotal,
      cartDiscount,
      taxAmount,
      total,
      payment,
      receipt: {
        transactionId: generateId(),
        storeName: import.meta.env['VITE_STORE_NAME'] ?? 'Supermarket',
        storeAddress: import.meta.env['VITE_STORE_ADDRESS'] ?? '123 Main St',
        timestamp: Date.now(),
        items: cart.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          lineTotal: item.lineTotal,
          discount: item.itemDiscount?.value,
        })),
        subtotal,
        discounts: cartDiscount,
        tax: taxAmount,
        total,
        payment,
      },
      syncStatus: 'pending',
    };

    set({
      transactions: [transaction, ...get().transactions].slice(0, 50),
      currentTransaction: transaction,
      cart: [],
      cartDiscounts: [],
    });

    return transaction;
  },

  // Product actions
  searchProducts: (query: string): Product[] => {
    const { products } = get();
    const lower = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getProductByBarcode: (barcode: string): Product | null => {
    return get().productIndex.get(barcode) ?? null;
  },

  syncProducts: async (): Promise<void> => {
    // Implemented via SyncService
  },

  // Transaction actions
  getTransactionHistory: (limit = 50): Transaction[] => {
    return get().transactions.slice(0, limit);
  },

  getTransaction: (id: string): Transaction | null => {
    return get().transactions.find((t) => t.id === id) ?? null;
  },

  // Connectivity / sync state actions
  setOnline: (isOnline: boolean) => set({ isOnline }),
  setSyncing: (isSyncing: boolean) => set({ isSyncing }),
  setLastSync: (timestamp: number) => set({ lastSync: timestamp }),
  setError: (error: string | null) => set({ error }),
  setProducts: (products: Product[]) => {
    const productIndex = new Map<string, Product>();
    for (const product of products) {
      productIndex.set(product.barcode, product);
    }
    set({ products, productIndex });
  },
  addTransaction: (transaction: Transaction) => {
    set({ transactions: [transaction, ...get().transactions].slice(0, 50) });
  },
  updateTransactionSyncStatus: (id: string, status: Transaction['syncStatus']) => {
    set({
      transactions: get().transactions.map((t) =>
        t.id === id ? { ...t, syncStatus: status } : t
      ),
    });
  },
}));
