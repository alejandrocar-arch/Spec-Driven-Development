/**
 * Main entry point for the POS Frontend application.
 * Initializes the application and starts the React app.
 */

import { usePOSStore } from './store/posStore';
import { db } from './services/database/db';
import { APIClient } from './services/api/apiClient';
import { SyncService } from './services/sync/syncService';
import { SyncScheduler } from './services/sync/syncScheduler';
import { ConnectivityMonitor } from './services/sync/connectivityMonitor';
import { AppInitializer } from './services/init/appInitializer';

/**
 * Initialize the POS application.
 * This should be called before rendering the React app.
 */
export async function initializeApp(): Promise<void> {
  // Get the store instance
  const store = usePOSStore.getState();

  // Create API client
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const apiClient = new APIClient(apiBaseUrl);

  // Create sync service
  const syncService = new SyncService(apiClient, store);

  // Create sync scheduler
  const syncScheduler = new SyncScheduler(syncService, store);

  // Create connectivity monitor
  const connectivityMonitor = new ConnectivityMonitor(apiClient, store);

  // Create app initializer
  const appInitializer = new AppInitializer(
    db,
    store,
    syncScheduler,
    connectivityMonitor,
    apiClient
  );

  // Initialize the application
  await appInitializer.initialize();

  // Store the initializer for cleanup on app shutdown
  (window as any).__appInitializer = appInitializer;
}

/**
 * Cleanup function to be called on app shutdown.
 */
export function cleanupApp(): void {
  const appInitializer = (window as any).__appInitializer;
  if (appInitializer) {
    appInitializer.cleanup();
  }
}

// Initialize the app when the module is loaded
initializeApp().catch((error) => {
  console.error('Failed to initialize application:', error);
});
