/**
 * ConnectivityMonitor: Monitors network connectivity and updates the store.
 * Implements task 18.2 - listens to navigator.onLine events and periodic health checks.
 *
 * Requirements: 9.1, 9.2, 9.9
 */

import type { POSStore } from '../../types';
import type { APIClient } from '../api/apiClient';

/** Interval for periodic health checks (30 seconds) */
const HEALTH_CHECK_INTERVAL_MS = 30_000;

export class ConnectivityMonitor {
  private store: POSStore;
  private apiClient: APIClient;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private onRestoreCallback: (() => void) | null = null;

  constructor(apiClient: APIClient, store: POSStore) {
    this.apiClient = apiClient;
    this.store = store;
  }

  /**
   * Start monitoring connectivity.
   * Listens to online/offline events and runs periodic health checks.
   *
   * @param onRestore - Optional callback invoked when connectivity is restored
   */
  start(onRestore?: () => void): void {
    this.onRestoreCallback = onRestore ?? null;

    // Set initial state
    this.store.setOnline(navigator.onLine);

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Start periodic health check
    this.healthCheckTimer = setInterval(() => {
      void this.performHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop monitoring connectivity and clean up event listeners.
   */
  stop(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.onRestoreCallback = null;
  }

  /**
   * Handle the browser 'online' event.
   */
  private handleOnline = (): void => {
    const wasOffline = !this.store.isOnline;
    this.store.setOnline(true);

    // Trigger sync callback when connectivity is restored
    if (wasOffline && this.onRestoreCallback) {
      this.onRestoreCallback();
    }
  };

  /**
   * Handle the browser 'offline' event.
   */
  private handleOffline = (): void => {
    this.store.setOnline(false);
  };

  /**
   * Perform a periodic health check by pinging the API.
   * Updates connectivity state based on the result.
   */
  private async performHealthCheck(): Promise<void> {
    try {
      await this.apiClient.fetchProducts(Date.now()); // lightweight ping
      if (!this.store.isOnline) {
        const wasOffline = true;
        this.store.setOnline(true);
        if (wasOffline && this.onRestoreCallback) {
          this.onRestoreCallback();
        }
      }
    } catch {
      // If the request fails, we may be offline
      if (navigator.onLine === false) {
        this.store.setOnline(false);
      }
    }
  }
}
