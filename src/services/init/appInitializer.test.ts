/**
 * Unit tests for AppInitializer.
 * Tests task 19.7 - Initialize database and sync on app start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppInitializer, backupCartState } from './appInitializer';
import type { POSStore, Product, CartItem, Discount } from '../../types';
import type { POSDatabase } from '../database/db';
import type { SyncScheduler } from '../sync/syncScheduler';
import type { ConnectivityMonitor } from '../sync/connectivityMonitor';
import type { APIClient } from '../api/apiClient';

describe('AppInitializer', () => {
  let mockDb: POSDatabase;
  let mockStore: POSStore;
  let mockSyncScheduler: SyncScheduler;
  let mockConnectivityMonitor: ConnectivityMonitor;
  let mockApiClient: APIClient;
  let appInitializer: AppInitializer;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock database
    mockDb = {
      getAllProducts: vi.fn().mockResolvedValue([]),
      clearProducts: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Mock store
    mockStore = {
      products: [],
      cart: [],
      cartDiscounts: [],
      isOnline: true,
      setProducts: vi.fn(),
      setError: vi.fn(),
      addToCart: vi.fn(),
      applyDiscount: vi.fn(),
      clearCart: vi.fn(),
    } as any;

    // Mock sync scheduler
    mockSyncScheduler = {
      start: vi.fn(),
      stop: vi.fn(),
      triggerProductSync: vi.fn().mockResolvedValue({ success: true }),
      triggerTransactionSync: vi.fn().mockResolvedValue({ success: true }),
    } as any;

    // Mock connectivity monitor
    mockConnectivityMonitor = {
      start: vi.fn(),
      stop: vi.fn(),
    } as any;

    // Mock API client
    mockApiClient = {
      uploadTransaction: vi.fn().mockResolvedValue({ id: 'test', status: 'accepted' }),
    } as any;

    appInitializer = new AppInitializer(
      mockDb,
      mockStore,
      mockSyncScheduler,
      mockConnectivityMonitor,
      mockApiClient
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should load products from IndexedDB', async () => {
      const mockProducts: Product[] = [
        {
          id: '1',
          barcode: '1234567890123',
          name: 'Test Product',
          category: 'Test',
          price: 100,
          taxRate: 0.08,
          lastUpdated: Date.now(),
        },
      ];

      mockDb.getAllProducts = vi.fn().mockResolvedValue(mockProducts);

      await appInitializer.initialize();

      expect(mockDb.getAllProducts).toHaveBeenCalled();
      expect(mockStore.setProducts).toHaveBeenCalledWith(mockProducts);
    });

    it('should restore cart state from localStorage', async () => {
      const mockCart: CartItem[] = [
        {
          id: 'cart-1',
          product: {
            id: '1',
            barcode: '1234567890123',
            name: 'Test Product',
            category: 'Test',
            price: 100,
            taxRate: 0.08,
            lastUpdated: Date.now(),
          },
          quantity: 2,
          lineTotal: 200,
        },
      ];

      localStorage.setItem('pos-cart-backup', JSON.stringify(mockCart));

      await appInitializer.initialize();

      expect(mockStore.addToCart).toHaveBeenCalledWith(mockCart[0].product, mockCart[0].quantity);
    });

    it('should restore cart discounts from localStorage', async () => {
      const mockDiscounts: Discount[] = [
        {
          id: 'discount-1',
          type: 'percentage',
          value: 10,
          target: 'cart',
          appliedAt: Date.now(),
        },
      ];

      localStorage.setItem('pos-cart-discounts-backup', JSON.stringify(mockDiscounts));

      await appInitializer.initialize();

      expect(mockStore.applyDiscount).toHaveBeenCalledWith(mockDiscounts[0]);
    });

    it('should start connectivity monitoring', async () => {
      await appInitializer.initialize();

      expect(mockConnectivityMonitor.start).toHaveBeenCalled();
    });

    it('should start sync scheduler', async () => {
      await appInitializer.initialize();

      expect(mockSyncScheduler.start).toHaveBeenCalled();
    });

    it('should trigger initial sync when online', async () => {
      mockStore.isOnline = true;

      await appInitializer.initialize();

      expect(mockSyncScheduler.triggerProductSync).toHaveBeenCalled();
      expect(mockSyncScheduler.triggerTransactionSync).toHaveBeenCalled();
    });

    it('should not trigger initial sync when offline', async () => {
      mockStore.isOnline = false;

      await appInitializer.initialize();

      expect(mockSyncScheduler.triggerProductSync).not.toHaveBeenCalled();
      expect(mockSyncScheduler.triggerTransactionSync).not.toHaveBeenCalled();
    });

    it('should handle product loading errors gracefully', async () => {
      mockDb.getAllProducts = vi.fn().mockRejectedValue(new Error('Database error'));
      mockStore.isOnline = false;

      await appInitializer.initialize();

      expect(mockStore.setError).toHaveBeenCalled();
    });

    it('should clear cart if restoration fails', async () => {
      localStorage.setItem('pos-cart-backup', 'invalid json');

      await appInitializer.initialize();

      expect(mockStore.clearCart).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop sync scheduler and connectivity monitor', () => {
      appInitializer.cleanup();

      expect(mockSyncScheduler.stop).toHaveBeenCalled();
      expect(mockConnectivityMonitor.stop).toHaveBeenCalled();
    });
  });

  describe('backupCartState', () => {
    it('should save cart to localStorage', () => {
      const mockCart: CartItem[] = [
        {
          id: 'cart-1',
          product: {
            id: '1',
            barcode: '1234567890123',
            name: 'Test Product',
            category: 'Test',
            price: 100,
            taxRate: 0.08,
            lastUpdated: Date.now(),
          },
          quantity: 2,
          lineTotal: 200,
        },
      ];

      const mockDiscounts: Discount[] = [
        {
          id: 'discount-1',
          type: 'percentage',
          value: 10,
          target: 'cart',
          appliedAt: Date.now(),
        },
      ];

      backupCartState(mockCart, mockDiscounts);

      const savedCart = localStorage.getItem('pos-cart-backup');
      const savedDiscounts = localStorage.getItem('pos-cart-discounts-backup');

      expect(savedCart).toBe(JSON.stringify(mockCart));
      expect(savedDiscounts).toBe(JSON.stringify(mockDiscounts));
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => backupCartState([], [])).not.toThrow();

      // Restore original implementation
      localStorage.setItem = originalSetItem;
    });
  });
});
