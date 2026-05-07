/**
 * Main entry point for the POS Frontend application.
 * Initializes the application and renders the React app.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
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
async function initializeApp(): Promise<void> {
  try {
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

    console.log('✅ Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    throw error;
  }
}

/**
 * Cleanup function to be called on app shutdown.
 */
function cleanupApp(): void {
  const appInitializer = (window as any).__appInitializer;
  if (appInitializer) {
    appInitializer.cleanup();
  }
}

// Initialize and render the app
initializeApp()
  .then(() => {
    // Render React app
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('✅ React app rendered successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to start application:', error);
    
    // Display error message to user
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f4f6; padding: 20px;">
          <div style="max-width: 500px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; margin-bottom: 16px;">⚠️ Application Error</h1>
            <p style="color: #374151; margin-bottom: 16px;">
              Failed to initialize the POS application. Please check the console for details.
            </p>
            <button 
              onclick="window.location.reload()" 
              style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;"
            >
              Reload Application
            </button>
          </div>
        </div>
      `;
    }
  });

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupApp);
