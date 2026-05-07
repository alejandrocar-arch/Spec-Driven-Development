/**
 * NetworkStatus component
 * Displays offline indicator, sync status, and queued operations.
 * 
 * Implements task 21.4
 * Requirements: 9.2, 9.10, 10.6, 10.7
 */

import React from 'react';
import { usePOSStore } from '../../store/posStore';
import { useSyncAnnouncements } from '../../hooks/useScreenReader';

export interface NetworkStatusProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * NetworkStatus Component
 * 
 * Displays:
 * - Offline indicator when not connected
 * - Sync status (syncing, last sync time)
 * - Number of pending transactions
 * 
 * Requirements:
 * - 9.2: Display visual indicator showing current connectivity status
 * - 9.10: Display visual indicator showing current connectivity status
 * - 10.6: Retry synchronization every 60 seconds when it fails
 * - 10.7: Display last successful synchronization timestamp
 */
export const NetworkStatus: React.FC<NetworkStatusProps> = ({ className = '' }) => {
  const isOnline = usePOSStore((s) => s.isOnline);
  const isSyncing = usePOSStore((s) => s.isSyncing);
  const lastSync = usePOSStore((s) => s.lastSync);
  const transactions = usePOSStore((s) => s.transactions);

  // Count pending transactions
  const pendingCount = transactions.filter((t) => t.syncStatus === 'pending').length;

  // Screen reader announcements for sync status changes (Task 25.4)
  useSyncAnnouncements(isOnline, isSyncing, pendingCount);

  // Format last sync time
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isOnline && !isSyncing && pendingCount === 0) {
    // Online and synced - show minimal indicator
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <div className="flex items-center gap-1.5 text-green-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Online</span>
        </div>
        {lastSync && (
          <span className="text-gray-500 text-xs">
            Synced {formatLastSync(lastSync)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm p-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-2">
        {isOnline ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-900">Online</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm font-medium text-gray-900">Offline</span>
          </>
        )}
      </div>

      {/* Sync Status */}
      {isSyncing && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Syncing...</span>
        </div>
      )}

      {/* Pending Transactions */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} pending sync
          </span>
        </div>
      )}

      {/* Last Sync Time (Req 10.7) */}
      {lastSync && (
        <div className="text-xs text-gray-500">
          Last synced: {formatLastSync(lastSync)}
        </div>
      )}

      {/* Offline Message */}
      {!isOnline && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
          Transactions will sync when connection is restored
        </div>
      )}
    </div>
  );
};

/**
 * Compact NetworkStatus indicator for header/toolbar
 */
export const NetworkStatusCompact: React.FC<NetworkStatusProps> = ({ className = '' }) => {
  const isOnline = usePOSStore((s) => s.isOnline);
  const isSyncing = usePOSStore((s) => s.isSyncing);
  const transactions = usePOSStore((s) => s.transactions);

  const pendingCount = transactions.filter((t) => t.syncStatus === 'pending').length;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection Indicator */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
          isOnline
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
        title={isOnline ? 'Connected' : 'Offline'}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? 'bg-green-600' : 'bg-red-600'
          }`}
        />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Sync Indicator */}
      {isSyncing && (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs"
          title="Syncing..."
        >
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Sync</span>
        </div>
      )}

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs"
          title={`${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} pending`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span>{pendingCount}</span>
        </div>
      )}
    </div>
  );
};
