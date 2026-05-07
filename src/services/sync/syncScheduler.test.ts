/**
 * Tests for SyncScheduler - background sync scheduler.
 *
 * Validates:
 * - Requirement 10.3: Products updated within 5 minutes
 * - Requirement 10.4: Product prices updated within 5 minutes
 * - Requirement 10.5: Background sync without interrupting transactions
 * - Requirement 10.6: Retry every 60 seconds on failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncScheduler, PRODUCT_SYNC_INTERVAL_MS, RETRY_INTERVAL_MS } from './syncScheduler';
import type { SyncService } from './syncService';
import type { POSStore, Transaction } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockSyncService(overrides?: Partial<SyncService>): SyncService {
  return {
    syncProducts: vi.fn().mockResolvedValue({ success: true, added: 0, updated: 0 }),
    syncTransactions: vi.fn().mockResolvedValue({ success: true, synced: 0, failed: 0 }),
    ...overrides,
  } as unknown as SyncService;
}

function makeMockStore(overrides?: Partial<POSStore>): POSStore {
  return {
    isOnline: true,
    isSyncing: false,
    transactions: [],
    products: [],
    productIndex: new Map(),
    lastSync: null,
    cart: [],
    cartDiscounts: [],
    currentTransaction: null,
    error: null,
    setOnline: vi.fn(),
    setSyncing: vi.fn(),
    setLastSync: vi.fn(),
    setError: vi.fn(),
    setProducts: vi.fn(),
    addTransaction: vi.fn(),
    updateTransactionSyncStatus: vi.fn(),
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    applyDiscount: vi.fn(),
    removeDiscount: vi.fn(),
    clearCart: vi.fn(),
    checkout: vi.fn(),
    searchProducts: vi.fn().mockReturnValue([]),
    getProductByBarcode: vi.fn().mockReturnValue(null),
    syncProducts: vi.fn(),
    getTransactionHistory: vi.fn().mockReturnValue([]),
    getTransaction: vi.fn().mockReturnValue(null),
    ...overrides,
  } as unknown as POSStore;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SyncScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── start / stop ──────────────────────────────────────────────────────────

  describe('start()', () => {
    it('sets isRunning to true', () => {
      const scheduler = new SyncScheduler(makeMockSyncService(), makeMockStore());
      scheduler.start();
      expect(scheduler.running).toBe(true);
      scheduler.stop();
    });

    it('does not start twice if called multiple times', () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore();
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      scheduler.start(); // second call should be a no-op

      // Only one initial sync should have been triggered
      expect(syncService.syncProducts).toHaveBeenCalledTimes(1);
      scheduler.stop();
    });

    it('performs an immediate product sync when online on start', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      // Flush microtasks to let the initial async syncs complete
      await Promise.resolve();
      await Promise.resolve();

      expect(syncService.syncProducts).toHaveBeenCalledTimes(1);
      scheduler.stop();
    });

    it('performs an immediate transaction sync when online on start', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      expect(syncService.syncTransactions).toHaveBeenCalledTimes(1);
      scheduler.stop();
    });

    it('does NOT sync on start when offline', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: false });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      expect(syncService.syncProducts).not.toHaveBeenCalled();
      expect(syncService.syncTransactions).not.toHaveBeenCalled();
      scheduler.stop();
    });
  });

  describe('stop()', () => {
    it('sets isRunning to false', () => {
      const scheduler = new SyncScheduler(makeMockSyncService(), makeMockStore());
      scheduler.start();
      scheduler.stop();
      expect(scheduler.running).toBe(false);
    });

    it('stops product sync timer after stop()', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();
      const callsAfterStart = (syncService.syncProducts as ReturnType<typeof vi.fn>).mock.calls.length;

      scheduler.stop();

      // Advance time past the product sync interval - no new calls should happen
      await vi.advanceTimersByTimeAsync(PRODUCT_SYNC_INTERVAL_MS * 2);
      expect(syncService.syncProducts).toHaveBeenCalledTimes(callsAfterStart);
    });

    it('is safe to call stop() without start()', () => {
      const scheduler = new SyncScheduler(makeMockSyncService(), makeMockStore());
      expect(() => scheduler.stop()).not.toThrow();
    });
  });

  // ── Product sync interval ─────────────────────────────────────────────────

  describe('Product sync every 5 minutes (Requirement 10.3, 10.4)', () => {
    it('syncs products after 5 minutes when online', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      // Flush initial sync microtasks
      await Promise.resolve();
      await Promise.resolve();

      const initialCalls = (syncService.syncProducts as ReturnType<typeof vi.fn>).mock.calls.length;

      // Advance exactly 5 minutes
      await vi.advanceTimersByTimeAsync(PRODUCT_SYNC_INTERVAL_MS);

      expect(syncService.syncProducts).toHaveBeenCalledTimes(initialCalls + 1);
      scheduler.stop();
    });

    it('syncs products multiple times over multiple intervals', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      const initialCalls = (syncService.syncProducts as ReturnType<typeof vi.fn>).mock.calls.length;

      // Advance 3 intervals
      await vi.advanceTimersByTimeAsync(PRODUCT_SYNC_INTERVAL_MS * 3);

      expect(syncService.syncProducts).toHaveBeenCalledTimes(initialCalls + 3);
      scheduler.stop();
    });

    it('does NOT sync products when offline during interval', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: false });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      // Advance past the product sync interval
      await vi.advanceTimersByTimeAsync(PRODUCT_SYNC_INTERVAL_MS + 1000);

      expect(syncService.syncProducts).not.toHaveBeenCalled();
      scheduler.stop();
    });
  });

  // ── Transaction sync after checkout ──────────────────────────────────────

  describe('triggerTransactionSync() - immediate sync after checkout (Requirement 10.5)', () => {
    it('syncs transactions immediately when online', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      const callsBefore = (syncService.syncTransactions as ReturnType<typeof vi.fn>).mock.calls.length;

      await scheduler.triggerTransactionSync();

      expect(syncService.syncTransactions).toHaveBeenCalledTimes(callsBefore + 1);
      scheduler.stop();
    });

    it('returns failure result when offline', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: false });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();

      const result = await scheduler.triggerTransactionSync();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Offline');
      scheduler.stop();
    });

    it('can be called without starting the scheduler', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      const result = await scheduler.triggerTransactionSync();

      expect(result.success).toBe(true);
      expect(syncService.syncTransactions).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerProductSync()', () => {
    it('syncs products immediately when online', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      const result = await scheduler.triggerProductSync();

      expect(result.success).toBe(true);
      expect(syncService.syncProducts).toHaveBeenCalledTimes(1);
    });

    it('returns failure result when offline', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: false });
      const scheduler = new SyncScheduler(syncService, store);

      const result = await scheduler.triggerProductSync();

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Offline');
    });
  });

  // ── Retry failed syncs every 60 seconds ──────────────────────────────────

  describe('Retry failed syncs every 60 seconds (Requirement 10.6)', () => {
    it('retries product sync after 60 seconds when previous sync failed', async () => {
      const syncService = makeMockSyncService({
        syncProducts: vi.fn()
          .mockResolvedValueOnce({ success: false, errors: ['Network error'] })
          .mockResolvedValue({ success: true, added: 0, updated: 0 }),
      });
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      // Initial sync failed - syncState.productSyncFailed should be true
      expect(scheduler.getSyncState().productSyncFailed).toBe(true);

      // Advance 60 seconds - retry should fire
      await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);

      // syncProducts should have been called again (retry)
      expect(syncService.syncProducts).toHaveBeenCalledTimes(2);
      scheduler.stop();
    });

    it('retries transaction sync after 60 seconds when previous sync failed', async () => {
      const syncService = makeMockSyncService({
        syncTransactions: vi.fn()
          .mockResolvedValueOnce({ success: false, failed: 1, errors: ['Network error'] })
          .mockResolvedValue({ success: true, synced: 1, failed: 0 }),
      });
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      expect(scheduler.getSyncState().transactionSyncFailed).toBe(true);

      await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);

      expect(syncService.syncTransactions).toHaveBeenCalledTimes(2);
      scheduler.stop();
    });

    it('retries pending transactions even when no explicit failure was recorded', async () => {
      const pendingTransaction: Partial<Transaction> = {
        id: 'tx-1',
        syncStatus: 'pending',
      };
      const syncService = makeMockSyncService();
      const store = makeMockStore({
        isOnline: true,
        transactions: [pendingTransaction as Transaction],
      });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      const callsAfterStart = (syncService.syncTransactions as ReturnType<typeof vi.fn>).mock.calls.length;

      // Advance 60 seconds - retry should fire because there are pending transactions
      await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);

      expect(syncService.syncTransactions).toHaveBeenCalledTimes(callsAfterStart + 1);
      scheduler.stop();
    });

    it('does NOT retry when offline', async () => {
      const syncService = makeMockSyncService({
        syncProducts: vi.fn().mockResolvedValue({ success: false, errors: ['error'] }),
      });
      const store = makeMockStore({ isOnline: false });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      // Advance past retry interval
      await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS * 3);

      // No syncs should have been attempted (offline)
      expect(syncService.syncProducts).not.toHaveBeenCalled();
      scheduler.stop();
    });

    it('clears failure state after successful retry', async () => {
      const syncService = makeMockSyncService({
        syncProducts: vi.fn()
          .mockResolvedValueOnce({ success: false, errors: ['error'] })
          .mockResolvedValue({ success: true, added: 0, updated: 0 }),
      });
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      expect(scheduler.getSyncState().productSyncFailed).toBe(true);

      // Advance to trigger retry
      await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);

      expect(scheduler.getSyncState().productSyncFailed).toBe(false);
      scheduler.stop();
    });
  });

  // ── getSyncState ──────────────────────────────────────────────────────────

  describe('getSyncState()', () => {
    it('returns initial state with no failures', () => {
      const scheduler = new SyncScheduler(makeMockSyncService(), makeMockStore());
      const state = scheduler.getSyncState();

      expect(state.productSyncFailed).toBe(false);
      expect(state.transactionSyncFailed).toBe(false);
      expect(state.lastProductSyncAttempt).toBeNull();
      expect(state.lastTransactionSyncAttempt).toBeNull();
    });

    it('records last sync attempt timestamps', async () => {
      const syncService = makeMockSyncService();
      const store = makeMockStore({ isOnline: true });
      const scheduler = new SyncScheduler(syncService, store);

      const before = Date.now();
      scheduler.start();
      await Promise.resolve();
      await Promise.resolve();

      const state = scheduler.getSyncState();
      expect(state.lastProductSyncAttempt).not.toBeNull();
      expect(state.lastProductSyncAttempt!).toBeGreaterThanOrEqual(before);
      scheduler.stop();
    });
  });

  // ── Constants ─────────────────────────────────────────────────────────────

  describe('exported constants', () => {
    it('PRODUCT_SYNC_INTERVAL_MS is 5 minutes (300,000ms)', () => {
      expect(PRODUCT_SYNC_INTERVAL_MS).toBe(300_000);
    });

    it('RETRY_INTERVAL_MS is 60 seconds (60,000ms)', () => {
      expect(RETRY_INTERVAL_MS).toBe(60_000);
    });
  });
});
