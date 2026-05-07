/**
 * useScreenReader hook
 * Provides screen reader announcements for dynamic content changes.
 * 
 * Implements task 25.4: Add screen reader announcements
 * Requirements: 11.3, 11.5, 11.6
 */

import { useEffect, useRef, useCallback } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

// Singleton announcement regions to avoid multiple instances
let politeRegion: HTMLDivElement | null = null;
let assertiveRegion: HTMLDivElement | null = null;
let refCount = 0;

function createAnnouncementRegions() {
  if (refCount === 0) {
    // Create polite announcement region
    if (!politeRegion) {
      politeRegion = document.createElement('div');
      politeRegion.setAttribute('role', 'status');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'true');
      politeRegion.className = 'sr-only';
      document.body.appendChild(politeRegion);
    }

    // Create assertive announcement region
    if (!assertiveRegion) {
      assertiveRegion = document.createElement('div');
      assertiveRegion.setAttribute('role', 'alert');
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.className = 'sr-only';
      document.body.appendChild(assertiveRegion);
    }
  }
  refCount++;
}

function cleanupAnnouncementRegions() {
  refCount--;
  if (refCount === 0) {
    if (politeRegion && politeRegion.parentNode) {
      politeRegion.parentNode.removeChild(politeRegion);
      politeRegion = null;
    }
    if (assertiveRegion && assertiveRegion.parentNode) {
      assertiveRegion.parentNode.removeChild(assertiveRegion);
      assertiveRegion = null;
    }
  }
}

/**
 * Hook for announcing messages to screen readers
 * 
 * Usage:
 * ```tsx
 * const announce = useScreenReader();
 * 
 * // Polite announcement (doesn't interrupt)
 * announce('Product added to cart');
 * 
 * // Assertive announcement (interrupts current speech)
 * announce('Error: Invalid barcode', 'assertive');
 * ```
 */
export function useScreenReader() {
  // Create announcement regions on mount
  useEffect(() => {
    createAnnouncementRegions();
    return () => {
      cleanupAnnouncementRegions();
    };
  }, []);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const targetRegion = priority === 'assertive' ? assertiveRegion : politeRegion;
    
    if (targetRegion) {
      // Clear previous message
      targetRegion.textContent = '';
      
      // Set new message after a brief delay to ensure screen readers detect the change
      setTimeout(() => {
        if (targetRegion) {
          targetRegion.textContent = message;
        }
      }, 100);
    }
  }, []);

  return announce;
}

/**
 * Hook for announcing cart updates to screen readers
 * Automatically announces when items are added, removed, or quantities change
 */
export function useCartAnnouncements(
  cart: Array<{ id: string; product: { name: string }; quantity: number }>,
  total: number
) {
  const announce = useScreenReader();
  const prevCartRef = useRef(cart);
  const prevTotalRef = useRef(total);

  useEffect(() => {
    const prevCart = prevCartRef.current;
    const prevTotal = prevTotalRef.current;

    // Detect added items
    const addedItems = cart.filter(
      (item) => {
        for (let i = 0; i < prevCart.length; i++) {
          if (prevCart[i].id === item.id) return false;
        }
        return true;
      }
    );
    
    // Detect removed items
    const removedItems = prevCart.filter(
      (item) => {
        for (let i = 0; i < cart.length; i++) {
          if (cart[i].id === item.id) return false;
        }
        return true;
      }
    );

    // Detect quantity changes
    const quantityChanges = cart.filter((item) => {
      let prevItem = null;
      for (let i = 0; i < prevCart.length; i++) {
        if (prevCart[i].id === item.id) {
          prevItem = prevCart[i];
          break;
        }
      }
      return prevItem && prevItem.quantity !== item.quantity;
    });

    // Announce changes
    if (addedItems.length > 0) {
      addedItems.forEach((item) => {
        announce(`${item.product.name} added to cart. Quantity: ${item.quantity}`);
      });
    }

    if (removedItems.length > 0) {
      removedItems.forEach((item) => {
        announce(`${item.product.name} removed from cart`);
      });
    }

    if (quantityChanges.length > 0) {
      quantityChanges.forEach((item) => {
        announce(`${item.product.name} quantity updated to ${item.quantity}`);
      });
    }

    // Announce total change if significant (more than $0.10 difference)
    if (Math.abs(total - prevTotal) > 10) {
      const totalDollars = (total / 100).toFixed(2);
      announce(`Cart total: $${totalDollars}`);
    }

    // Update refs
    prevCartRef.current = cart;
    prevTotalRef.current = total;
  }, [cart, total, announce]);
}

/**
 * Hook for announcing sync status changes to screen readers
 */
export function useSyncAnnouncements(
  isOnline: boolean,
  isSyncing: boolean,
  pendingCount: number
) {
  const announce = useScreenReader();
  const prevOnlineRef = useRef(isOnline);
  const prevSyncingRef = useRef(isSyncing);
  const prevPendingRef = useRef(pendingCount);

  useEffect(() => {
    // Announce connectivity changes
    if (isOnline !== prevOnlineRef.current) {
      if (isOnline) {
        announce('Connection restored. Syncing transactions.', 'polite');
      } else {
        announce('Connection lost. Operating in offline mode.', 'assertive');
      }
    }

    // Announce sync completion
    if (prevSyncingRef.current && !isSyncing) {
      if (pendingCount === 0) {
        announce('All transactions synced successfully.', 'polite');
      } else {
        announce(`Sync completed. ${pendingCount} transactions pending.`, 'polite');
      }
    }

    // Update refs
    prevOnlineRef.current = isOnline;
    prevSyncingRef.current = isSyncing;
    prevPendingRef.current = pendingCount;
  }, [isOnline, isSyncing, pendingCount, announce]);
}

/**
 * Hook for announcing errors to screen readers
 */
export function useErrorAnnouncements(error: string | null) {
  const announce = useScreenReader();
  const prevErrorRef = useRef(error);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      announce(`Error: ${error}`, 'assertive');
    }
    prevErrorRef.current = error;
  }, [error, announce]);
}
