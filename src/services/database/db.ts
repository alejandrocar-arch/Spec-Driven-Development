/**
 * Database service using Dexie.js for IndexedDB operations.
 * Implements task 3.1, 3.2, 3.4 - IndexedDB schema and operations.
 *
 * Requirements: 10.2, 1.1, 1.2, 1.3, 2.2, 3.3, 12.1, 12.3
 */

import Dexie, { type Table } from 'dexie';
import type { Product, Transaction } from '../../types';

/**
 * POS Database class extending Dexie.
 * Defines the schema for products and transactions.
 */
export class POSDatabase extends Dexie {
  // Tables
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super('pos-db');

    // Define schema version 1
    this.version(1).stores({
      // Products table with indexes
      products: 'id, barcode, name, category, lastUpdated',
      // Transactions table with indexes
      transactions: 'id, timestamp, syncStatus',
    });
  }

  /**
   * Get a product by barcode.
   * Requirements: 2.2, 3.3
   */
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    return this.products.where('barcode').equals(barcode).first();
  }

  /**
   * Search products by partial name match (case-insensitive).
   * Returns results sorted alphabetically by name.
   * Requirements: 1.1, 1.2, 1.4
   */
  async searchProductsByName(query: string): Promise<Product[]> {
    if (query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const allProducts = await this.products.toArray();

    return allProducts
      .filter((p) => p.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Search products by exact category match.
   * Returns results sorted alphabetically by name.
   * Requirements: 1.3, 1.4
   */
  async searchProductsByCategory(category: string): Promise<Product[]> {
    const products = await this.products.where('category').equals(category).toArray();
    return products.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Upsert products (insert or update).
   * Requirements: 10.2
   */
  async upsertProducts(products: Product[]): Promise<void> {
    await this.products.bulkPut(products);
  }

  /**
   * Clear all products from the database.
   * Requirements: 13.4
   */
  async clearProducts(): Promise<void> {
    await this.products.clear();
  }

  /**
   * Get all products from the database.
   * Requirements: 10.2
   */
  async getAllProducts(): Promise<Product[]> {
    return this.products.toArray();
  }

  /**
   * Save a transaction to the database.
   * Requirements: 12.1
   */
  async saveTransaction(transaction: Transaction): Promise<void> {
    await this.transactions.put(transaction);
  }

  /**
   * Get transaction history (last N transactions, sorted by timestamp descending).
   * Requirements: 12.1, 12.3
   */
  async getTransactionHistory(limit: number = 50): Promise<Transaction[]> {
    return this.transactions.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  /**
   * Get a transaction by ID.
   * Requirements: 12.4
   */
  async getTransactionById(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  /**
   * Update transaction sync status.
   * Requirements: 10.5
   */
  async updateTransactionSyncStatus(
    id: string,
    status: Transaction['syncStatus']
  ): Promise<void> {
    await this.transactions.update(id, { syncStatus: status });
  }

  /**
   * Get all transactions with a specific sync status.
   * Requirements: 9.9, 10.5
   */
  async getTransactionsByStatus(
    status: Transaction['syncStatus']
  ): Promise<Transaction[]> {
    return this.transactions.where('syncStatus').equals(status).toArray();
  }
}

// Export a singleton instance
export const db = new POSDatabase();
