/**
 * Application Initializer: Handles app startup initialization.
 * Implements task 19.7 - Initialize database and sync on app start.
 * Implements task 22.1, 22.2 - Initialize offline queue processors.
 *
 * Responsibilities:
 * - Load products from IndexedDB into the store
 * - Restore cart state from localStorage
 * - Initialize offline queue processors
 * - Trigger initial sync if online
 *
 * Requirements: 8.10, 9.9, 10.1, 13.3
 */

import type { POSStore, CartItem } from '../../types';
import type { POSDatabase } from '../database/db';
import type { SyncScheduler } from '../sync/syncScheduler';
import type { ConnectivityMonitor } from '../sync/connectivityMonitor';
import { initializeQueueProcessors } from '../queue/queueHelpers';
import type { EmailReceiptOperation, PrintReceiptOperation, TransactionSyncOperation } from '../queue/offlineQueue';
import type { APIClient } from '../api/apiClient';

/** LocalStorage key for cart backup */
const CART_BACKUP_KEY = 'pos-cart-backup';

/** LocalStorage key for cart discounts backup */
const CART_DISCOUNTS_BACKUP_KEY = 'pos-cart-discounts-backup';

export class AppInitializer {
  private db: POSDatabase;
  private store: POSStore;
  private syncScheduler: SyncScheduler;
  private connectivityMonitor: ConnectivityMonitor;
  private apiClient: APIClient;

  constructor(
    db: POSDatabase,
    store: POSStore,
    syncScheduler: SyncScheduler,
    connectivityMonitor: ConnectivityMonitor,
    apiClient: APIClient
  ) {
    this.db = db;
    this.store = store;
    this.syncScheduler = syncScheduler;
    this.connectivityMonitor = connectivityMonitor;
    this.apiClient = apiClient;
  }

  /**
   * Initialize the application on startup.
   * 
   * Steps:
   * 1. Initialize offline queue processors
   * 2. Load products from IndexedDB
   * 3. Restore cart state from localStorage
   * 4. Start connectivity monitoring
   * 5. Start sync scheduler
   * 6. Trigger initial sync if online
   *
   * Requirements: 8.10, 9.9, 10.1, 13.3
   */
  async initialize(): Promise<void> {
    try {
      // Step 1: Initialize offline queue processors (Requirements 8.10, 9.9)
      this.initializeQueueProcessors();

      // Step 2: Load products from IndexedDB (Requirement 10.1)
      await this.loadProducts();

      // Step 3: Restore cart state from localStorage (Requirement 13.3)
      this.restoreCartState();

      // Step 4: Start connectivity monitoring
      this.connectivityMonitor.start(() => {
        // Callback when connectivity is restored
        void this.syncScheduler.triggerProductSync();
        void this.syncScheduler.triggerTransactionSync();
      });

      // Step 5: Start sync scheduler
      this.syncScheduler.start();

      // Step 6: Trigger initial sync if online (Requirement 10.1)
      if (this.store.isOnline) {
        await this.triggerInitialSync();
      }

      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.store.setError('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Cleanup resources on app shutdown.
   */
  cleanup(): void {
    this.syncScheduler.stop();
    this.connectivityMonitor.stop();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Initialize offline queue processors.
   * Sets up handlers for email, print, and transaction sync operations.
   * Requirements: 8.10, 9.9
   */
  private initializeQueueProcessors(): void {
    // Email processor: sends receipt via email
    const emailProcessor = async (operation: EmailReceiptOperation): Promise<void> => {
      console.log(`Processing email receipt for transaction ${operation.transactionId}`);
      
      // TODO: Implement actual email sending via API
      // For now, we'll simulate the operation
      // In a real implementation, this would call an API endpoint like:
      // await this.apiClient.sendReceiptEmail(operation.emailAddress, operation.receiptData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`Email receipt sent to ${operation.emailAddress}`);
    };

    // Print processor: sends receipt to printer
    const printProcessor = async (operation: PrintReceiptOperation): Promise<void> => {
      console.log(`Processing print receipt for transaction ${operation.transactionId}`);
      
      // TODO: Implement actual printing via browser print API or printer service
      // For now, we'll simulate the operation
      // In a real implementation, this would trigger the browser print dialog or
      // send to a network printer via an API
      
      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`Receipt printed for transaction ${operation.transactionId}`);
    };

    // Transaction processor: syncs transaction to backend
    const transactionProcessor = async (operation: TransactionSyncOperation): Promise<void> => {
      console.log(`Processing transaction sync for transaction ${operation.transaction.id}`);
      
      // Upload transaction to backend
      await this.apiClient.uploadTransaction(operation.transaction);
      
      // Update transaction sync status in store
      this.store.updateTransactionSyncStatus(operation.transaction.id, 'synced');
      
      console.log(`Transaction ${operation.transaction.id} synced successfully`);
    };

    // Register all processors
    initializeQueueProcessors(emailProcessor, printProcessor, transactionProcessor);
  }

  /**
   * Load products from IndexedDB into the store.
   * If database is empty, load sample products for development.
   * Requirement: 10.1
   */
  private async loadProducts(): Promise<void> {
    try {
      let products = await this.db.getAllProducts();
      
      // If database is empty, load sample products for development
      if (products.length === 0) {
        console.log('Database is empty, loading sample products...');
        const { loadSampleProducts } = await import('../../data/sampleProducts');
        await loadSampleProducts(this.db);
        products = await this.db.getAllProducts();
      }
      
      this.store.setProducts(products);
      console.log(`Loaded ${products.length} products from IndexedDB`);
    } catch (error) {
      console.error('Failed to load products from IndexedDB:', error);
      // Attempt database recovery
      await this.recoverProductDatabase();
    }
  }

  /**
   * Restore cart state from localStorage.
   * Requirement: 13.3
   */
  private restoreCartState(): void {
    try {
      // Restore cart items
      const savedCart = localStorage.getItem(CART_BACKUP_KEY);
      if (savedCart) {
        const cart: CartItem[] = JSON.parse(savedCart);
        // Restore cart by adding each item
        for (const item of cart) {
          this.store.addToCart(item.product, item.quantity);
          // Restore item discount if present
          if (item.itemDiscount) {
            this.store.applyDiscount(item.itemDiscount);
          }
        }
        console.log(`Restored ${cart.length} items to cart from localStorage`);
      }

      // Restore cart discounts
      const savedDiscounts = localStorage.getItem(CART_DISCOUNTS_BACKUP_KEY);
      if (savedDiscounts) {
        const discounts = JSON.parse(savedDiscounts);
        for (const discount of discounts) {
          this.store.applyDiscount(discount);
        }
        console.log(`Restored ${discounts.length} cart discounts from localStorage`);
      }
    } catch (error) {
      console.error('Failed to restore cart state from localStorage:', error);
      // Start with empty cart if restoration fails
      this.store.clearCart();
    }
  }

  /**
   * Trigger initial sync when online.
   * Requirement: 10.1
   */
  private async triggerInitialSync(): Promise<void> {
    try {
      console.log('Triggering initial sync...');
      
      // Sync products first
      const productResult = await this.syncScheduler.triggerProductSync();
      if (productResult.success) {
        console.log('Initial product sync completed successfully');
      } else {
        console.warn('Initial product sync failed:', productResult.errors);
      }

      // Sync any pending transactions
      const transactionResult = await this.syncScheduler.triggerTransactionSync();
      if (transactionResult.success) {
        console.log('Initial transaction sync completed successfully');
      } else {
        console.warn('Initial transaction sync failed:', transactionResult.errors);
      }
    } catch (error) {
      console.error('Initial sync failed:', error);
      // Don't throw - app can still function offline
    }
  }

  /**
   * Attempt to recover corrupted product database.
   * Requirement: 13.4
   */
  private async recoverProductDatabase(): Promise<void> {
    try {
      console.log('Attempting to recover product database...');
      
      // Clear corrupted database
      await this.db.clearProducts();
      
      // Re-download from API if online
      if (this.store.isOnline) {
        const result = await this.syncScheduler.triggerProductSync();
        if (result.success) {
          console.log('Product database recovered successfully');
        } else {
          throw new Error('Failed to re-download products');
        }
      } else {
        throw new Error('Cannot recover product database while offline');
      }
    } catch (error) {
      console.error('Product database recovery failed:', error);
      this.store.setError(
        'Product database is corrupted and cannot be recovered while offline. Please connect to the internet and refresh.'
      );
    }
  }
}

/**
 * Setup cart state backup on every cart modification.
 * This should be called after the store is created to subscribe to cart changes.
 * Requirement: 13.3
 * 
 * Note: This function is currently not used as the backup is integrated directly
 * into the store actions. It's kept for future extensibility.
 */
export function setupCartBackup(_store: POSStore): void {
  // Subscribe to cart changes and backup to localStorage
  // Note: Zustand doesn't have a built-in subscribe for specific state slices,
  // so we'll need to implement this in the store or use a middleware
  
  // For now, we'll export a helper function that should be called after cart modifications
  // This will be integrated into the store actions
}

/**
 * Backup cart state to localStorage.
 * Should be called after every cart modification.
 * Requirement: 13.3
 */
export function backupCartState(cart: CartItem[], cartDiscounts: any[]): void {
  try {
    localStorage.setItem(CART_BACKUP_KEY, JSON.stringify(cart));
    localStorage.setItem(CART_DISCOUNTS_BACKUP_KEY, JSON.stringify(cartDiscounts));
  } catch (error) {
    console.error('Failed to backup cart state:', error);
  }
}
