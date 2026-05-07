/**
 * Unit tests for queue helper functions
 * Task 22.3
 * Requirements: 8.10, 9.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queueEmailReceipt, queuePrintReceipt, queueTransactionSync, initializeQueueProcessors } from './queueHelpers';
import { offlineQueue } from './offlineQueue';
import type { Transaction } from '../../types';

describe('Queue Helpers', () => {
  beforeEach(() => {
    // Clear the queue before each test
    offlineQueue.clear();
  });

  describe('queueEmailReceipt', () => {
    it('should queue an email receipt operation', () => {
      queueEmailReceipt('txn-123', 'customer@example.com', '<html>Receipt</html>');

      const pending = offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('email');
      
      const emailOp = pending[0] as any;
      expect(emailOp.transactionId).toBe('txn-123');
      expect(emailOp.emailAddress).toBe('customer@example.com');
      expect(emailOp.receiptData).toBe('<html>Receipt</html>');
      expect(emailOp.status).toBe('pending');
      expect(emailOp.retryCount).toBe(0);
    });
  });

  describe('queuePrintReceipt', () => {
    it('should queue a print receipt operation', () => {
      queuePrintReceipt('txn-456', 'Receipt content to print');

      const pending = offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('print');
      
      const printOp = pending[0] as any;
      expect(printOp.transactionId).toBe('txn-456');
      expect(printOp.receiptData).toBe('Receipt content to print');
      expect(printOp.status).toBe('pending');
      expect(printOp.retryCount).toBe(0);
    });
  });

  describe('queueTransactionSync', () => {
    it('should queue a transaction sync operation', () => {
      const transaction: Transaction = {
        id: 'txn-789',
        timestamp: Date.now(),
        items: [],
        subtotal: 1000,
        cartDiscount: 0,
        taxAmount: 80,
        total: 1080,
        payment: { method: 'cash', amountTendered: 1100, changeDue: 20 },
        receipt: {
          transactionId: 'txn-789',
          storeName: 'Test Store',
          storeAddress: '123 Main St',
          timestamp: Date.now(),
          items: [],
          subtotal: 1000,
          discounts: 0,
          tax: 80,
          total: 1080,
          payment: { method: 'cash', amountTendered: 1100, changeDue: 20 },
        },
        syncStatus: 'pending',
      };

      queueTransactionSync(transaction);

      const pending = offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('transaction');
      
      const txnOp = pending[0] as any;
      expect(txnOp.transaction).toEqual(transaction);
      expect(txnOp.status).toBe('pending');
      expect(txnOp.retryCount).toBe(0);
    });
  });

  describe('initializeQueueProcessors', () => {
    it('should register processors for all operation types', async () => {
      const emailProcessor = vi.fn().mockResolvedValue(undefined);
      const printProcessor = vi.fn().mockResolvedValue(undefined);
      const transactionProcessor = vi.fn().mockResolvedValue(undefined);

      initializeQueueProcessors(emailProcessor, printProcessor, transactionProcessor);

      // Queue operations of each type
      queueEmailReceipt('txn-1', 'test@example.com', 'Receipt 1');
      queuePrintReceipt('txn-2', 'Receipt 2');
      
      const transaction: Transaction = {
        id: 'txn-3',
        timestamp: Date.now(),
        items: [],
        subtotal: 1000,
        cartDiscount: 0,
        taxAmount: 80,
        total: 1080,
        payment: { method: 'cash' },
        receipt: {
          transactionId: 'txn-3',
          storeName: 'Test Store',
          storeAddress: '123 Main St',
          timestamp: Date.now(),
          items: [],
          subtotal: 1000,
          discounts: 0,
          tax: 80,
          total: 1080,
          payment: { method: 'cash' },
        },
        syncStatus: 'pending',
      };
      queueTransactionSync(transaction);

      // Process the queue
      const results = await offlineQueue.processQueue();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(emailProcessor).toHaveBeenCalledTimes(1);
      expect(printProcessor).toHaveBeenCalledTimes(1);
      expect(transactionProcessor).toHaveBeenCalledTimes(1);
    });
  });
});
