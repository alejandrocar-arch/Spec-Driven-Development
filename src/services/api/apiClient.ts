/**
 * API Client for communicating with the backend REST API.
 * Handles product fetching and transaction uploading with proper error handling.
 */

import type { Product, Transaction, ProductsResponse, TransactionResponse, APIError as APIErrorType } from '../../types';
import { APIError } from '../../types';

export class APIClient {
  private baseURL: string;
  private timeout: number = 10000; // 10 second timeout

  constructor(baseURL: string = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * Fetch products from the backend API.
   * @param since - Optional Unix timestamp to fetch only products updated after this time
   */
  async fetchProducts(since?: number): Promise<ProductsResponse> {
    const url = since
      ? `${this.baseURL}/api/products?since=${since}`
      : `${this.baseURL}/api/products`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }

    return response.json() as Promise<ProductsResponse>;
  }

  /**
   * Upload a completed transaction to the backend API.
   * @param transaction - The transaction to upload
   */
  async uploadTransaction(transaction: Transaction): Promise<TransactionResponse> {
    const response = await fetch(`${this.baseURL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }

    return response.json() as Promise<TransactionResponse>;
  }
}

/**
 * Utility: sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 * Initial delay: 1s, max delay: 60s, multiplier: 2, max retries: 5
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let delay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(delay);
      delay = Math.min(delay * 2, 60000);
    }
  }

  throw new Error('Max retries exceeded');
}

export type { APIErrorType };
