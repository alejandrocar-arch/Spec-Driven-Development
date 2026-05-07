/**
 * Database Recovery Service tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseRecoveryService } from './databaseRecovery';
import { POSDatabase } from './db';
import { usePOSStore } from '../../store/posStore';
import type { Product } from '../../types';

describe('DatabaseRecoveryService', () => {
  let db: POSDatabase;
  let recoveryService: DatabaseRecoveryService;

  beforeEach(() => {
    // Reset store
    usePOSStore.setState({
      cart: [],
      cartDiscounts: [],
      products: [],
      productIndex: new Map(),
      lastSync: null,
      transactions: [],
      currentTransaction: null,
      isOnline: true,
      isSyncing: false,
      error: null,
    });

    db = new POSDatabase();
    const store = usePOSStore.getState();
    recoveryService = new DatabaseRecoveryService(db, store);
  });

  describe('isDatabaseCorrupted', () => {
    it('returns false for healthy database', async () => {
      // Mock healthy database
      vi.spyOn(db, 'getAllProducts').mockResolvedValue([
        {
          id: 'p1',
          barcode: '123456789012',
          name: 'Test Product',
          category: 'Test',
          price: 100,
          taxRate: 0.08,
          lastUpdated: Date.now(),
        },
      ]);

      const isCorrupted = await recoveryService.isDatabaseCorrupted();
      expect(isCorrupted).toBe(false);
    });

    it('returns true when database throws error (Req 13.4)', async () => {
      // Mock database error
      vi.spyOn(db, 'getAllProducts').mockRejectedValue(new Error('Database error'));

      const isCorrupted = await recoveryService.isDatabaseCorrupted();
      expect(isCorrupted).toBe(true);
    });

    it('returns true when database returns invalid data type', async () => {
      // Mock invalid data
      vi.spyOn(db, 'getAllProducts').mockResolvedValue(null as any);

      const isCorrupted = await recoveryService.isDatabaseCorrupted();
      expect(isCorrupted).toBe(true);
    });

    it('returns true when products have missing required fields', async () => {
      // Mock invalid product data
      vi.spyOn(db, 'getAllProducts').mockResolvedValue([
        {
          id: 'p1',
          // Missing barcode, name, price
        } as any,
      ]);

      const isCorrupted = await recoveryService.isDatabaseCorrupted();
      expect(isCorrupted).toBe(true);
    });

    it('returns true when product price is not a number', async () => {
      vi.spyOn(db, 'getAllProducts').mockResolvedValue([
        {
          id: 'p1',
          barcode: '123456789012',
          name: 'Test',
          category: 'Test',
          price: 'invalid' as any,
          taxRate: 0.08,
          lastUpdated: Date.now(),
        },
      ]);

      const isCorrupted = await recoveryService.isDatabaseCorrupted();
      expect(isCorrupted).toBe(true);
    });
  });

  describe('recoverDatabase', () => {
    it('clears database and returns success when online (Req 13.4)', async () => {
      const clearSpy = vi.spyOn(db, 'clearProducts').mockResolvedValue();
      usePOSStore.setState({ isOnline: true });

      const result = await recoveryService.recoverDatabase();

      expect(clearSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('cleared successfully');
    });

    it('returns error when offline (Req 13.5)', async () => {
      usePOSStore.setState({ isOnline: false });
      // Recreate service with updated store state
      const store = usePOSStore.getState();
      const offlineRecoveryService = new DatabaseRecoveryService(db, store);

      const result = await offlineRecoveryService.recoverDatabase();

      expect(result.success).toBe(false);
      expect(result.error).toBe('offline');
      expect(result.message).toContain('Cannot recover database while offline');
    });

    it('sets error in store when offline', async () => {
      usePOSStore.setState({ isOnline: false });
      const store = usePOSStore.getState();
      const setErrorSpy = vi.spyOn(store, 'setError');
      const offlineRecoveryService = new DatabaseRecoveryService(db, store);

      await offlineRecoveryService.recoverDatabase();

      expect(setErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot recover database while offline')
      );
    });

    it('handles clear database failure', async () => {
      vi.spyOn(db, 'clearProducts').mockRejectedValue(new Error('Clear failed'));
      vi.spyOn(db, 'close').mockImplementation(() => {});
      vi.spyOn(db, 'delete').mockResolvedValue();
      vi.spyOn(db, 'open').mockResolvedValue(db);
      usePOSStore.setState({ isOnline: true });

      const result = await recoveryService.recoverDatabase();

      // Should still succeed by recreating database
      expect(result.success).toBe(true);
    });
  });

  describe('validateDatabaseIntegrity', () => {
    it('returns true for healthy database', async () => {
      vi.spyOn(db, 'isOpen').mockReturnValue(true);
      vi.spyOn(db, 'getAllProducts').mockResolvedValue([]);
      vi.spyOn(db, 'getTransactionHistory').mockResolvedValue([]);
      Object.defineProperty(db, 'tables', {
        get: () => [{ name: 'products' }, { name: 'transactions' }],
      });

      const isValid = await recoveryService.validateDatabaseIntegrity();
      expect(isValid).toBe(true);
    });

    it('returns false when database has no tables', async () => {
      vi.spyOn(db, 'isOpen').mockReturnValue(true);
      Object.defineProperty(db, 'tables', {
        get: () => [],
      });

      const isValid = await recoveryService.validateDatabaseIntegrity();
      expect(isValid).toBe(false);
    });

    it('returns false when products table returns invalid data', async () => {
      vi.spyOn(db, 'isOpen').mockReturnValue(true);
      vi.spyOn(db, 'getAllProducts').mockResolvedValue(null as any);
      Object.defineProperty(db, 'tables', {
        get: () => [{ name: 'products' }],
      });

      const isValid = await recoveryService.validateDatabaseIntegrity();
      expect(isValid).toBe(false);
    });

    it('returns false when database operations throw errors', async () => {
      vi.spyOn(db, 'isOpen').mockReturnValue(true);
      vi.spyOn(db, 'getAllProducts').mockRejectedValue(new Error('Read error'));
      Object.defineProperty(db, 'tables', {
        get: () => [{ name: 'products' }],
      });

      const isValid = await recoveryService.validateDatabaseIntegrity();
      expect(isValid).toBe(false);
    });
  });
});
