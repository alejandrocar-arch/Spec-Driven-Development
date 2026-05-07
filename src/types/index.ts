/**
 * Core TypeScript types and interfaces for the POS Frontend
 */

/** A product available for purchase */
export interface Product {
  id: string;                    // UUID
  barcode: string;               // EAN-13 or UPC-A
  name: string;                  // Product name
  category: string;              // Product category
  price: number;                 // Price in cents (avoid floating point)
  taxRate: number;               // Tax rate as decimal (e.g., 0.08 for 8%)
  imageUrl?: string;             // Optional product image
  lastUpdated: number;           // Unix timestamp for sync
}

/** A discount applied to an item or the entire cart */
export interface Discount {
  id: string;                    // UUID
  type: 'percentage' | 'fixed';  // Discount type
  value: number;                 // Percentage (0-100) or fixed amount in cents
  target: 'item' | 'cart';       // Application scope
  targetItemId?: string;         // Required if target is 'item'
  appliedAt: number;             // Unix timestamp
}

/** A single item in the shopping cart */
export interface CartItem {
  id: string;                    // UUID for cart item
  product: Product;              // Full product details
  quantity: number;              // Quantity in cart
  itemDiscount?: Discount;       // Optional item-level discount
  lineTotal: number;             // Calculated: (price * quantity) - discount
}

/** Payment details for a transaction */
export interface Payment {
  method: 'cash' | 'credit' | 'debit';
  amountTendered?: number;       // For cash payments
  changeDue?: number;            // For cash payments
  cardLast4?: string;            // For card payments (masked)
  authorizationCode?: string;    // For card payments
}

/** A single item on a receipt */
export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discount?: number;
}

/** A generated receipt */
export interface Receipt {
  transactionId: string;
  storeName: string;
  storeAddress: string;
  timestamp: number;
  items: ReceiptItem[];
  subtotal: number;
  discounts: number;
  tax: number;
  total: number;
  payment: Payment;
}

/** A completed transaction */
export interface Transaction {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp
  items: CartItem[];             // Purchased items
  subtotal: number;              // Sum of line totals
  cartDiscount: number;          // Cart-level discount amount
  taxAmount: number;             // Total tax
  total: number;                 // Final amount charged
  payment: Payment;              // Payment details
  receipt: Receipt;              // Generated receipt
  syncStatus: 'pending' | 'synced' | 'failed';  // Sync state
}

/** Result of a sync operation */
export interface SyncResult {
  success: boolean;
  added?: number;
  updated?: number;
  synced?: number;
  failed?: number;
  errors?: string[];
  timestamp?: number;
}

/** API response for products */
export interface ProductsResponse {
  products: Product[];
  timestamp: number;
}

/** API response for transaction upload */
export interface TransactionResponse {
  id: string;
  status: 'accepted';
}

/** Custom API error */
export class APIError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/** Zustand store interface */
export interface POSStore {
  // Product state
  products: Product[];
  productIndex: Map<string, Product>;  // Barcode -> Product lookup
  lastSync: number | null;

  // Cart state
  cart: CartItem[];
  cartDiscounts: Discount[];

  // Transaction state
  transactions: Transaction[];
  currentTransaction: Transaction | null;

  // UI state
  isOnline: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  applyDiscount: (discount: Discount) => void;
  removeDiscount: (discountId: string) => void;
  clearCart: () => void;
  checkout: (payment: Payment) => Promise<Transaction>;

  // Product actions
  searchProducts: (query: string) => Product[];
  getProductByBarcode: (barcode: string) => Product | null;
  syncProducts: () => Promise<void>;

  // Transaction actions
  getTransactionHistory: (limit?: number) => Transaction[];
  getTransaction: (id: string) => Transaction | null;

  // Connectivity actions
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSync: (timestamp: number) => void;
  setError: (error: string | null) => void;
  setProducts: (products: Product[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransactionSyncStatus: (id: string, status: Transaction['syncStatus']) => void;
}
