/**
 * useKeyboardShortcuts hook
 * Manages keyboard shortcuts for the POS application.
 * 
 * Supported shortcuts:
 * - Ctrl+F: Focus product search
 * - Ctrl+B: Focus barcode input
 * - Ctrl+S: Open camera scanner
 * - Ctrl+Enter: Proceed to checkout
 * - Ctrl+K: Clear cart
 * - Delete: Remove selected cart item
 * - Esc: Close modal/scanner
 * 
 * Requirements: 11.3
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
  onFocusSearch?: () => void;
  onFocusBarcode?: () => void;
  onOpenScanner?: () => void;
  onCheckout?: () => void;
  onClearCart?: () => void;
  onRemoveItem?: () => void;
  onCloseModal?: () => void;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  handler: () => void;
}

/**
 * Hook to register keyboard shortcuts for the POS application.
 * 
 * @param handlers - Object containing handler functions for each shortcut
 * @param enabled - Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields (except Esc)
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      // Esc always works, even in input fields
      if (event.key === 'Escape') {
        if (handlers.onCloseModal) {
          event.preventDefault();
          handlers.onCloseModal();
        }
        return;
      }

      // Delete key works when not in input fields
      if (event.key === 'Delete' && !isInputField) {
        if (handlers.onRemoveItem) {
          event.preventDefault();
          handlers.onRemoveItem();
        }
        return;
      }

      // Ctrl-based shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'f':
            if (handlers.onFocusSearch) {
              event.preventDefault();
              handlers.onFocusSearch();
            }
            break;

          case 'b':
            if (handlers.onFocusBarcode) {
              event.preventDefault();
              handlers.onFocusBarcode();
            }
            break;

          case 's':
            if (handlers.onOpenScanner) {
              event.preventDefault();
              handlers.onOpenScanner();
            }
            break;

          case 'k':
            if (handlers.onClearCart) {
              event.preventDefault();
              handlers.onClearCart();
            }
            break;

          case 'enter':
            if (handlers.onCheckout) {
              event.preventDefault();
              handlers.onCheckout();
            }
            break;

          default:
            break;
        }
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Get the list of all available keyboard shortcuts.
 * Useful for displaying in a help menu.
 */
export function getKeyboardShortcuts(): Array<{
  keys: string;
  description: string;
}> {
  return [
    { keys: 'Ctrl+F', description: 'Focus product search' },
    { keys: 'Ctrl+B', description: 'Focus barcode input' },
    { keys: 'Ctrl+S', description: 'Open camera scanner' },
    { keys: 'Ctrl+Enter', description: 'Proceed to checkout' },
    { keys: 'Ctrl+K', description: 'Clear cart' },
    { keys: 'Delete', description: 'Remove selected cart item' },
    { keys: 'Esc', description: 'Close modal/scanner' },
  ];
}
