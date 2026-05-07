/**
 * SyncService: Handles synchronization of products and transactions with the backend API.
 * Implements task 18.1 - syncProducts and syncTransactions.
 *
 * Requirements: 9.9, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { POSStore, SyncResult, Transaction } from '../../types';
import { APIError } from '../../types';
import type { APIClient } from '../api/apiClient';
import { retryWithBackoff } from '../api/apiClient';

export class SyncService {
  private apiClient: APIClient;
  private store: POSStore;

  constructor(apiClient: APIClient, store: POSStore) {
    this.apiClient = apiClient;
    this.store = store;
  }

  /**
   * Synchronize products from the backend API into the local store.
   * Fetches only products updated since the last sync (incremental sync).
   *
   * Requirements: 10.1, 10.2, 10.3, 10.4
   */
  async syncProducts(): Promise<SyncResult> {
    const { lastSync, setProducts, setLastSync, setSyncing, setError } = this.store;

    setSyncing(true);
    setError(null);

    try {
      const result = await retryWithBackoff(async () => {
        return this.apiClient.fetchProducts(lastSync ?? undefined);
      });

      // Merge new products with existing ones
      const existingProducts = this.store.products;
      const updatedMap = new Map(existingProducts.map((p) => [p.id, p]));

      let added = 0;
      let updated = 0;

      for (const product of result.products) {
        if (updatedMap.has(product.id)) {
          updated++;
        } else {
          added++;
        }
        updatedMap.set(product.id, product);
      }

      setProducts(Array.from(updatedMap.values()));
      setLastSync(result.timestamp);

      return {
        success: true,
        added,
        updated,
        timestamp: result.timestamp,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      setError(`Product sync failed: ${message}`);
      return {
        success: false,
        errors: [message],
      };
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Synchronize pending transactions to the backend API.
   * Uploads all transactions with syncStatus === 'pending'.
   *
   * Requirements: 9.9, 10.5
   */
  async syncTransactions(): Promise<SyncResult> {
    const { transactions, updateTransactionSyncStatus, setSyncing, setError } = this.store;

    const pending = transactions.filter((t) => t.syncStatus === 'pending');

    if (pending.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    setSyncing(true);
    setError(null);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const transaction of pending) {
      try {
        await this.uploadTransaction(transaction);
        updateTransactionSyncStatus(transaction.id, 'synced');
        synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        // 400 errors are permanent failures - do not retry
        if (error instanceof APIError && error.statusCode === 400) {
          updateTransactionSyncStatus(transaction.id, 'failed');
        }
        // Other errors: keep as pending for retry
        errors.push(`Transaction ${transaction.id}: ${message}`);
        failed++;
      }
    }

    setSyncing(false);

    if (failed > 0) {
      setError(`${failed} transaction(s) failed to sync`);
    }

    return { success: failed === 0, synced, failed, errors };
  }

  /**
   * Upload a single transaction with exponential backoff retry.
   * 400 errors are not retried (permanent failure).
   */
  private async uploadTransaction(transaction: Transaction): Promise<void> {
    await retryWithBackoff(async () => {
      try {
        await this.apiClient.uploadTransaction(transaction);
      } catch (error) {
        // Do not retry 400 errors
        if (error instanceof APIError && error.statusCode === 400) {
          throw error;
        }
        throw error;
      }
    });
  }
}
