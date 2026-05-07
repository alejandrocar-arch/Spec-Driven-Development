/**
 * Database Recovery Service
 * Detects corrupted database and attempts recovery.
 * 
 * Implements task 21.2
 * Requirements: 13.4, 13.5
 */

import type { POSDatabase } from './db';
import type { POSStore } from '../../types';

export interface RecoveryResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Database Recovery Service
 * 
 * Handles detection and recovery of corrupted IndexedDB database.
 * 
 * Requirements:
 * - 13.4: Detect corrupted database and attempt re-download
 * - 13.5: Display error when database cannot be loaded
 */
export class DatabaseRecoveryService {
  private db: POSDatabase;
  private store: POSStore;

  constructor(db: POSDatabase, store: POSStore) {
    this.db = db;
    this.store = store;
  }

  /**
   * Check if the database is corrupted or empty.
   * 
   * A database is considered corrupted if:
   * - It cannot be opened
   * - It throws errors on basic operations
   * - It returns invalid data
   * 
   * Requirement: 13.4
   */
  async isDatabaseCorrupted(): Promise<boolean> {
    try {
      // Try to perform a basic read operation
      const products = await this.db.getAllProducts();
      
      // Check if products array is valid
      if (!Array.isArray(products)) {
        console.error('Database returned invalid data type');
        return true;
      }

      // Check if products have required fields
      for (const product of products.slice(0, 10)) {
        if (!product.id || !product.barcode || !product.name || typeof product.price !== 'number') {
          console.error('Database contains invalid product data:', product);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Database corruption detected:', error);
      return true;
    }
  }

  /**
   * Attempt to recover the corrupted database.
   * 
   * Recovery steps:
   * 1. Clear the corrupted database
   * 2. If online: trigger product sync to re-download
   * 3. If offline: display error message
   * 
   * Requirements: 13.4, 13.5
   */
  async recoverDatabase(): Promise<RecoveryResult> {
    try {
      console.log('Starting database recovery...');

      // Step 1: Check if online first
      if (!this.store.isOnline) {
        const message = 'Cannot recover database while offline. Please connect to the internet and try again.';
        this.store.setError(message);
        return {
          success: false,
          message,
          error: 'offline',
        };
      }

      // Step 2: Clear corrupted database
      await this.clearDatabase();
      console.log('Corrupted database cleared');

      // Step 3: Trigger product sync (re-download)
      console.log('Re-downloading product database...');
      
      // Note: The actual sync will be triggered by the caller (AppInitializer or SyncScheduler)
      // This service only handles the detection and clearing
      
      return {
        success: true,
        message: 'Database cleared successfully. Re-downloading products...',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database recovery failed:', error);
      
      this.store.setError(`Database recovery failed: ${errorMessage}`);
      
      return {
        success: false,
        message: 'Failed to recover database',
        error: errorMessage,
      };
    }
  }

  /**
   * Clear all data from the database.
   * 
   * This is a destructive operation that removes all products and transactions.
   * Should only be called when the database is confirmed to be corrupted.
   */
  private async clearDatabase(): Promise<void> {
    try {
      await this.db.clearProducts();
      console.log('Products cleared from database');
    } catch (error) {
      console.error('Failed to clear database:', error);
      
      // If clearing fails, try to delete and recreate the entire database
      await this.recreateDatabase();
    }
  }

  /**
   * Delete and recreate the entire database.
   * 
   * This is a last resort when the database is so corrupted that
   * even clearing tables fails.
   */
  private async recreateDatabase(): Promise<void> {
    try {
      console.log('Attempting to recreate database...');
      
      // Close the database connection
      this.db.close();
      
      // Delete the database
      await this.db.delete();
      console.log('Database deleted');
      
      // Reopen the database (this will recreate it with the schema)
      await this.db.open();
      console.log('Database recreated successfully');
    } catch (error) {
      console.error('Failed to recreate database:', error);
      throw new Error('Database is severely corrupted and cannot be recovered');
    }
  }

  /**
   * Validate database integrity.
   * 
   * Performs comprehensive checks on the database to ensure it's working correctly.
   * 
   * @returns true if database is healthy, false if corrupted
   */
  async validateDatabaseIntegrity(): Promise<boolean> {
    try {
      // Check if database can be opened
      if (!this.db.isOpen()) {
        await this.db.open();
      }

      // Check if tables exist
      const tables = this.db.tables;
      if (tables.length === 0) {
        console.error('Database has no tables');
        return false;
      }

      // Check if we can read from products table
      const products = await this.db.getAllProducts();
      if (!Array.isArray(products)) {
        console.error('Products table returned invalid data');
        return false;
      }

      // Check if we can read from transactions table
      const transactions = await this.db.getTransactionHistory(1);
      if (!Array.isArray(transactions)) {
        console.error('Transactions table returned invalid data');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database integrity validation failed:', error);
      return false;
    }
  }
}
