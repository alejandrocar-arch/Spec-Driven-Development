/**
 * Offline Queue Service
 * Manages queuing of operations that require network connectivity.
 * Processes queued operations when connectivity is restored.
 *
 * Task 22.1, 22.2
 * Requirements: 8.10, 9.9
 */

import type { Transaction } from '../../types';

/** Types of operations that can be queued */
export type QueuedOperationType = 'email' | 'print' | 'transaction';

/** Base interface for queued operations */
export interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/** Email receipt operation */
export interface EmailReceiptOperation extends QueuedOperation {
  type: 'email';
  transactionId: string;
  emailAddress: string;
  receiptData: string;
}

/** Print receipt operation */
export interface PrintReceiptOperation extends QueuedOperation {
  type: 'print';
  transactionId: string;
  receiptData: string;
}

/** Transaction sync operation */
export interface TransactionSyncOperation extends QueuedOperation {
  type: 'transaction';
  transaction: Transaction;
}

/** Union type for all queued operations */
export type AnyQueuedOperation = EmailReceiptOperation | PrintReceiptOperation | TransactionSyncOperation;

/** Result of processing a queued operation */
export interface ProcessResult {
  success: boolean;
  operationId: string;
  error?: string;
}

/** Callback function for processing operations */
export type OperationProcessor<T extends QueuedOperation> = (operation: T) => Promise<void>;

/**
 * OfflineQueue manages operations that need to be performed when online.
 * Operations are stored in memory and can be persisted to localStorage.
 */
export class OfflineQueue {
  private queue: Map<string, AnyQueuedOperation> = new Map();
  private processors: Map<QueuedOperationType, OperationProcessor<any>> = new Map();
  private isProcessing = false;
  private storageKey = 'pos-offline-queue';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register a processor for a specific operation type.
   * Processors are called when operations are processed from the queue.
   */
  registerProcessor<T extends AnyQueuedOperation>(
    type: QueuedOperationType,
    processor: OperationProcessor<T>
  ): void {
    this.processors.set(type, processor);
  }

  /**
   * Add an operation to the queue.
   * Operations are automatically persisted to localStorage.
   */
  enqueue(operation: AnyQueuedOperation): void {
    this.queue.set(operation.id, operation);
    this.saveToStorage();
  }

  /**
   * Remove an operation from the queue.
   */
  dequeue(operationId: string): void {
    this.queue.delete(operationId);
    this.saveToStorage();
  }

  /**
   * Get all pending operations.
   */
  getPendingOperations(): AnyQueuedOperation[] {
    return Array.from(this.queue.values()).filter(op => op.status === 'pending');
  }

  /**
   * Get all operations of a specific type.
   */
  getOperationsByType(type: QueuedOperationType): AnyQueuedOperation[] {
    return Array.from(this.queue.values()).filter(op => op.type === type);
  }

  /**
   * Get the count of pending operations.
   */
  getPendingCount(): number {
    return this.getPendingOperations().length;
  }

  /**
   * Get a specific operation by ID.
   */
  getOperation(operationId: string): AnyQueuedOperation | undefined {
    return this.queue.get(operationId);
  }

  /**
   * Update the status of an operation.
   */
  updateOperationStatus(
    operationId: string,
    status: QueuedOperation['status'],
    error?: string
  ): void {
    const operation = this.queue.get(operationId);
    if (operation) {
      operation.status = status;
      if (status === 'completed' || status === 'failed') {
        // Remove completed or permanently failed operations after a delay
        setTimeout(() => this.dequeue(operationId), 5000);
      }
      this.saveToStorage();
    }
  }

  /**
   * Process all pending operations in the queue.
   * Returns results for each operation processed.
   */
  async processQueue(): Promise<ProcessResult[]> {
    if (this.isProcessing) {
      return [];
    }

    this.isProcessing = true;
    const results: ProcessResult[] = [];
    const pending = this.getPendingOperations();

    for (const operation of pending) {
      const result = await this.processOperation(operation);
      results.push(result);
    }

    this.isProcessing = false;
    return results;
  }

  /**
   * Process a single operation.
   */
  private async processOperation(operation: AnyQueuedOperation): Promise<ProcessResult> {
    const processor = this.processors.get(operation.type);

    if (!processor) {
      const error = `No processor registered for operation type: ${operation.type}`;
      this.updateOperationStatus(operation.id, 'failed', error);
      return {
        success: false,
        operationId: operation.id,
        error,
      };
    }

    this.updateOperationStatus(operation.id, 'processing');

    try {
      await processor(operation);
      this.updateOperationStatus(operation.id, 'completed');
      return {
        success: true,
        operationId: operation.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Increment retry count
      operation.retryCount++;
      
      // Mark as failed if max retries exceeded (5 retries)
      if (operation.retryCount >= 5) {
        this.updateOperationStatus(operation.id, 'failed', errorMessage);
      } else {
        // Reset to pending for retry
        this.updateOperationStatus(operation.id, 'pending');
      }

      return {
        success: false,
        operationId: operation.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear all operations from the queue.
   */
  clear(): void {
    this.queue.clear();
    this.saveToStorage();
  }

  /**
   * Clear only completed and failed operations.
   */
  clearCompleted(): void {
    const toRemove: string[] = [];
    for (const [id, operation] of this.queue.entries()) {
      if (operation.status === 'completed' || operation.status === 'failed') {
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this.queue.delete(id));
    this.saveToStorage();
  }

  /**
   * Save queue to localStorage for persistence.
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.queue.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage.
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const operations = JSON.parse(data) as AnyQueuedOperation[];
        for (const operation of operations) {
          // Reset processing operations to pending on load
          if (operation.status === 'processing') {
            operation.status = 'pending';
          }
          this.queue.set(operation.id, operation);
        }
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
    }
  }
}

/** Singleton instance */
export const offlineQueue = new OfflineQueue();
