/**
 * SyncScheduler: Background sync scheduler for the POS Frontend.
 * Implements task 18.3 - background sync scheduling.
 * Implements task 22.1, 22.2 - offline queue processing.
 *
 * Responsibilities:
 * - Sync products every 5 minutes when online (Requirement 10.3, 10.4)
 * - Sync transactions immediately after checkout (Requirement 10.5)
 * - Retry failed syncs every 60 seconds (Requirement 10.6)
 * - Process offline queue when connectivity is restored (Requirement 8.10, 9.9)
 *
 * Requirements: 8.10, 9.9, 10.3, 10.4, 10.5, 10.6
 */

import type { POSStore, SyncResult } from '../../types';
import type { SyncService } from './syncService';
import { offlineQueue } from '../queue/offlineQueue';

/** Product sync interval: 5 minutes */
export const PRODUCT_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 300,000ms

/** Retry interval for failed syncs: 60 seconds */
export const RETRY_INTERVAL_MS = 60 * 1000; // 60,000ms

/** Internal state for tracking sync failures */
interface SyncState {
  productSyncFailed: boolean;
  transactionSyncFailed: boolean;
  lastProductSyncAttempt: number | null;
  lastTransactionSyncAttempt: number | null;
}

export class SyncScheduler {
  private syncService: SyncService;
  private store: POSStore;

  private productSyncTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  private syncState: SyncState = {
    productSyncFailed: false,
    transactionSyncFailed: false,
    lastProductSyncAttempt: null,
    lastTransactionSyncAttempt: null,
  };

  private isRunning = false;

  constructor(syncService: SyncService, store: POSStore) {
    this.syncService = syncService;
    this.store = store;
  }

  /**
   * Start the background sync scheduler.
   * - Schedules product sync every 5 minutes when online.
   * - Schedules retry of failed syncs every 60 seconds.
   * - Performs an immediate sync if online.
   *
   * Requirements: 10.3, 10.4, 10.5, 10.6
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Perform an initial sync if online
    if (this.store.isOnline) {
      void this.runProductSync();
      void this.runTransactionSync();
    }

    // Schedule product sync every 5 minutes (Requirement 10.3, 10.4)
    this.productSyncTimer = setInterval(() => {
      if (this.store.isOnline) {
        void this.runProductSync();
      }
    }, PRODUCT_SYNC_INTERVAL_MS);

    // Schedule retry of failed syncs every 60 seconds (Requirement 10.6)
    this.retryTimer = setInterval(() => {
      if (this.store.isOnline) {
        void this.retryFailedSyncs();
      }
    }, RETRY_INTERVAL_MS);
  }

  /**
   * Stop the background sync scheduler and clean up timers.
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.productSyncTimer !== null) {
      clearInterval(this.productSyncTimer);
      this.productSyncTimer = null;
    }

    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Trigger an immediate transaction sync after checkout.
   * Called externally after a checkout is completed.
   * Also processes the offline queue when online.
   *
   * Requirement: 8.10, 9.9, 10.5
   */
  async triggerTransactionSync(): Promise<SyncResult> {
    if (!this.store.isOnline) {
      return { success: false, errors: ['Offline - transaction queued for sync'] };
    }
    
    // Process offline queue first
    await this.processOfflineQueue();
    
    return this.runTransactionSync();
  }

  /**
   * Trigger an immediate product sync (e.g., on connectivity restore).
   * Also processes the offline queue when connectivity is restored.
   *
   * Requirements: 8.10, 9.9, 10.3, 10.4
   */
  async triggerProductSync(): Promise<SyncResult> {
    if (!this.store.isOnline) {
      return { success: false, errors: ['Offline - product sync skipped'] };
    }
    
    // Process offline queue when connectivity is restored
    await this.processOfflineQueue();
    
    return this.runProductSync();
  }

  /**
   * Returns whether the scheduler is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Returns the current sync failure state (for testing/monitoring).
   */
  getSyncState(): Readonly<SyncState> {
    return { ...this.syncState };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Run a product sync and track failure state.
   */
  private async runProductSync(): Promise<SyncResult> {
    this.syncState.lastProductSyncAttempt = Date.now();

    const result = await this.syncService.syncProducts();

    if (result.success) {
      this.syncState.productSyncFailed = false;
    } else {
      this.syncState.productSyncFailed = true;
    }

    return result;
  }

  /**
   * Run a transaction sync and track failure state.
   */
  private async runTransactionSync(): Promise<SyncResult> {
    this.syncState.lastTransactionSyncAttempt = Date.now();

    const result = await this.syncService.syncTransactions();

    if (result.success) {
      this.syncState.transactionSyncFailed = false;
    } else {
      this.syncState.transactionSyncFailed = true;
    }

    return result;
  }

  /**
   * Retry any previously failed syncs.
   * Called every 60 seconds by the retry timer.
   * Also processes the offline queue periodically.
   *
   * Requirement: 8.10, 9.9, 10.6
   */
  private async retryFailedSyncs(): Promise<void> {
    const retries: Promise<SyncResult>[] = [];

    if (this.syncState.productSyncFailed) {
      retries.push(this.runProductSync());
    }

    if (this.syncState.transactionSyncFailed) {
      retries.push(this.runTransactionSync());
    }

    // Also retry any transactions still in 'pending' state
    const hasPendingTransactions = this.store.transactions.some(
      (t) => t.syncStatus === 'pending'
    );
    if (hasPendingTransactions && !this.syncState.transactionSyncFailed) {
      retries.push(this.runTransactionSync());
    }

    if (retries.length > 0) {
      await Promise.allSettled(retries);
    }
    
    // Process offline queue periodically
    await this.processOfflineQueue();
  }

  /**
   * Process the offline queue (email, print, transaction operations).
   * Called when connectivity is restored or periodically during retries.
   *
   * Requirements: 8.10, 9.9
   */
  private async processOfflineQueue(): Promise<void> {
    const pendingCount = offlineQueue.getPendingCount();
    
    if (pendingCount === 0) {
      return;
    }
    
    console.log(`Processing ${pendingCount} queued operations...`);
    
    try {
      const results = await offlineQueue.processQueue();
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        console.log(`Successfully processed ${successful} queued operations`);
      }
      
      if (failed > 0) {
        console.warn(`Failed to process ${failed} queued operations`);
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }
}
