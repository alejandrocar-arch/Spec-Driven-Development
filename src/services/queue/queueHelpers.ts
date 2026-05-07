/**
 * Queue Helper Functions
 * Provides convenient functions for queueing operations and initializing processors.
 *
 * Task 22.1, 22.2
 * Requirements: 8.10, 9.9
 */

import type { Transaction } from '../../types';
import {
  offlineQueue,
  type EmailReceiptOperation,
  type PrintReceiptOperation,
  type TransactionSyncOperation,
} from './offlineQueue';

/** Generate a simple UUID */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Queue an email receipt operation.
 * This operation will be processed when connectivity is restored.
 *
 * @param transactionId - The transaction ID
 * @param emailAddress - The recipient email address
 * @param receiptData - The receipt content (HTML or plain text)
 */
export function queueEmailReceipt(
  transactionId: string,
  emailAddress: string,
  receiptData: string
): void {
  const operation: EmailReceiptOperation = {
    id: generateId(),
    type: 'email',
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    transactionId,
    emailAddress,
    receiptData,
  };

  offlineQueue.enqueue(operation);
  console.log(`Email receipt queued for transaction ${transactionId} to ${emailAddress}`);
}

/**
 * Queue a print receipt operation.
 * This operation will be processed when connectivity is restored.
 *
 * @param transactionId - The transaction ID
 * @param receiptData - The receipt content to print
 */
export function queuePrintReceipt(
  transactionId: string,
  receiptData: string
): void {
  const operation: PrintReceiptOperation = {
    id: generateId(),
    type: 'print',
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    transactionId,
    receiptData,
  };

  offlineQueue.enqueue(operation);
  console.log(`Print receipt queued for transaction ${transactionId}`);
}

/**
 * Queue a transaction sync operation.
 * This operation will be processed when connectivity is restored.
 *
 * @param transaction - The transaction to sync
 */
export function queueTransactionSync(transaction: Transaction): void {
  const operation: TransactionSyncOperation = {
    id: generateId(),
    type: 'transaction',
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    transaction,
  };

  offlineQueue.enqueue(operation);
  console.log(`Transaction sync queued for transaction ${transaction.id}`);
}

/**
 * Initialize queue processors.
 * This should be called during application initialization.
 *
 * @param emailProcessor - Function to process email operations
 * @param printProcessor - Function to process print operations
 * @param transactionProcessor - Function to process transaction sync operations
 */
export function initializeQueueProcessors(
  emailProcessor: (operation: EmailReceiptOperation) => Promise<void>,
  printProcessor: (operation: PrintReceiptOperation) => Promise<void>,
  transactionProcessor: (operation: TransactionSyncOperation) => Promise<void>
): void {
  offlineQueue.registerProcessor('email', emailProcessor);
  offlineQueue.registerProcessor('print', printProcessor);
  offlineQueue.registerProcessor('transaction', transactionProcessor);
  console.log('Queue processors initialized');
}
