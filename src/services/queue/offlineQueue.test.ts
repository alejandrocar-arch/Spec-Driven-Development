/**
 * Unit tests for OfflineQueue
 * Task 22.3
 * Requirements: 8.10, 9.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineQueue, type EmailReceiptOperation, type PrintReceiptOperation, type TransactionSyncOperation } from './offlineQueue';
import type { Transaction } from '../../types';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    queue = new OfflineQueue();
  });

  describe('enqueue and dequeue', () => {
    it('should add an operation to the queue', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);

      expect(queue.getPendingCount()).toBe(1);
      expect(queue.getOperation('test-1')).toEqual(operation);
    });

    it('should remove an operation from the queue', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);
      expect(queue.getPendingCount()).toBe(1);

      queue.dequeue('test-1');
      expect(queue.getPendingCount()).toBe(0);
      expect(queue.getOperation('test-1')).toBeUndefined();
    });
  });

  describe('getPendingOperations', () => {
    it('should return only pending operations', () => {
      const op1: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt 1',
      };

      const op2: PrintReceiptOperation = {
        id: 'test-2',
        type: 'print',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'completed',
        transactionId: 'txn-2',
        receiptData: 'Receipt 2',
      };

      queue.enqueue(op1);
      queue.enqueue(op2);

      const pending = queue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('test-1');
    });
  });

  describe('getOperationsByType', () => {
    it('should return operations of a specific type', () => {
      const emailOp: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt 1',
      };

      const printOp: PrintReceiptOperation = {
        id: 'test-2',
        type: 'print',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-2',
        receiptData: 'Receipt 2',
      };

      queue.enqueue(emailOp);
      queue.enqueue(printOp);

      const emailOps = queue.getOperationsByType('email');
      expect(emailOps).toHaveLength(1);
      expect(emailOps[0].type).toBe('email');

      const printOps = queue.getOperationsByType('print');
      expect(printOps).toHaveLength(1);
      expect(printOps[0].type).toBe('print');
    });
  });

  describe('updateOperationStatus', () => {
    it('should update the status of an operation', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);
      queue.updateOperationStatus('test-1', 'processing');

      const updated = queue.getOperation('test-1');
      expect(updated?.status).toBe('processing');
    });
  });

  describe('processQueue', () => {
    it('should process all pending operations with registered processors', async () => {
      const emailProcessor = vi.fn().mockResolvedValue(undefined);
      const printProcessor = vi.fn().mockResolvedValue(undefined);

      queue.registerProcessor('email', emailProcessor);
      queue.registerProcessor('print', printProcessor);

      const emailOp: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt 1',
      };

      const printOp: PrintReceiptOperation = {
        id: 'test-2',
        type: 'print',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-2',
        receiptData: 'Receipt 2',
      };

      queue.enqueue(emailOp);
      queue.enqueue(printOp);

      const results = await queue.processQueue();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(emailProcessor).toHaveBeenCalledWith(emailOp);
      expect(printProcessor).toHaveBeenCalledWith(printOp);
    });

    it('should handle processor errors and retry', async () => {
      const failingProcessor = vi.fn().mockRejectedValue(new Error('Network error'));

      queue.registerProcessor('email', failingProcessor);

      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);

      const results = await queue.processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Network error');

      // Operation should still be pending for retry
      const updated = queue.getOperation('test-1');
      expect(updated?.status).toBe('pending');
      expect(updated?.retryCount).toBe(1);
    });

    it('should mark operation as failed after max retries', async () => {
      const failingProcessor = vi.fn().mockRejectedValue(new Error('Network error'));

      queue.registerProcessor('email', failingProcessor);

      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 4, // Already retried 4 times
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);

      const results = await queue.processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);

      // Operation should be marked as failed after 5th retry
      const updated = queue.getOperation('test-1');
      expect(updated?.status).toBe('failed');
      expect(updated?.retryCount).toBe(5);
    });

    it('should return error when no processor is registered', async () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);

      const results = await queue.processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('No processor registered');
    });
  });

  describe('clear operations', () => {
    it('should clear all operations', () => {
      const op1: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt 1',
      };

      const op2: PrintReceiptOperation = {
        id: 'test-2',
        type: 'print',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-2',
        receiptData: 'Receipt 2',
      };

      queue.enqueue(op1);
      queue.enqueue(op2);

      expect(queue.getPendingCount()).toBe(2);

      queue.clear();

      expect(queue.getPendingCount()).toBe(0);
    });

    it('should clear only completed and failed operations', () => {
      const op1: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt 1',
      };

      const op2: PrintReceiptOperation = {
        id: 'test-2',
        type: 'print',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'completed',
        transactionId: 'txn-2',
        receiptData: 'Receipt 2',
      };

      const op3: EmailReceiptOperation = {
        id: 'test-3',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 5,
        status: 'failed',
        transactionId: 'txn-3',
        emailAddress: 'test3@example.com',
        receiptData: 'Receipt 3',
      };

      queue.enqueue(op1);
      queue.enqueue(op2);
      queue.enqueue(op3);

      queue.clearCompleted();

      expect(queue.getPendingCount()).toBe(1);
      expect(queue.getOperation('test-1')).toBeDefined();
      expect(queue.getOperation('test-2')).toBeUndefined();
      expect(queue.getOperation('test-3')).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('should persist queue to localStorage', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      queue.enqueue(operation);

      const stored = localStorage.getItem('pos-offline-queue');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test-1');
    });

    it('should load queue from localStorage on initialization', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      localStorage.setItem('pos-offline-queue', JSON.stringify([operation]));

      const newQueue = new OfflineQueue();

      expect(newQueue.getPendingCount()).toBe(1);
      expect(newQueue.getOperation('test-1')).toBeDefined();
    });

    it('should reset processing operations to pending on load', () => {
      const operation: EmailReceiptOperation = {
        id: 'test-1',
        type: 'email',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'processing',
        transactionId: 'txn-1',
        emailAddress: 'test@example.com',
        receiptData: 'Receipt content',
      };

      localStorage.setItem('pos-offline-queue', JSON.stringify([operation]));

      const newQueue = new OfflineQueue();

      const loaded = newQueue.getOperation('test-1');
      expect(loaded?.status).toBe('pending');
    });
  });
});
