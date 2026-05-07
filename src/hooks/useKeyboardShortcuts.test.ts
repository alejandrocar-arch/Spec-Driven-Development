/**
 * Unit tests for useKeyboardShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let handlers: {
    onFocusSearch: ReturnType<typeof vi.fn>;
    onFocusBarcode: ReturnType<typeof vi.fn>;
    onOpenScanner: ReturnType<typeof vi.fn>;
    onCheckout: ReturnType<typeof vi.fn>;
    onClearCart: ReturnType<typeof vi.fn>;
    onRemoveItem: ReturnType<typeof vi.fn>;
    onCloseModal: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers = {
      onFocusSearch: vi.fn(),
      onFocusBarcode: vi.fn(),
      onOpenScanner: vi.fn(),
      onCheckout: vi.fn(),
      onClearCart: vi.fn(),
      onRemoveItem: vi.fn(),
      onCloseModal: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call onFocusSearch when Ctrl+F is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('should call onFocusBarcode when Ctrl+B is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusBarcode).toHaveBeenCalledTimes(1);
  });

  it('should call onOpenScanner when Ctrl+S is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onOpenScanner).toHaveBeenCalledTimes(1);
  });

  it('should call onCheckout when Ctrl+Enter is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'enter',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onCheckout).toHaveBeenCalledTimes(1);
  });

  it('should call onClearCart when Ctrl+K is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onClearCart).toHaveBeenCalledTimes(1);
  });

  it('should call onRemoveItem when Delete is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onRemoveItem).toHaveBeenCalledTimes(1);
  });

  it('should call onCloseModal when Escape is pressed', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onCloseModal).toHaveBeenCalledTimes(1);
  });

  it('should not trigger shortcuts when disabled', () => {
    renderHook(() => useKeyboardShortcuts(handlers, false));

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusSearch).not.toHaveBeenCalled();
  });

  it('should not trigger Delete in input fields', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);

    // Try Delete in input field - should not trigger handler
    const deleteEvent = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    Object.defineProperty(deleteEvent, 'target', { value: input, enumerable: true });
    window.dispatchEvent(deleteEvent);

    expect(handlers.onRemoveItem).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should trigger Esc even in input fields', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    // Create a mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);

    // Esc should still work in input fields
    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    Object.defineProperty(escEvent, 'target', { value: input, enumerable: true });
    window.dispatchEvent(escEvent);

    expect(handlers.onCloseModal).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('should support metaKey (Cmd on Mac) as well as ctrlKey', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('should handle case-insensitive key matching', () => {
    renderHook(() => useKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'F', // uppercase
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onFocusSearch).not.toHaveBeenCalled();
  });
});

describe('getKeyboardShortcuts', () => {
  it('should return all keyboard shortcuts', () => {
    const shortcuts = getKeyboardShortcuts();

    expect(shortcuts).toHaveLength(7);
    expect(shortcuts).toEqual([
      { keys: 'Ctrl+F', description: 'Focus product search' },
      { keys: 'Ctrl+B', description: 'Focus barcode input' },
      { keys: 'Ctrl+S', description: 'Open camera scanner' },
      { keys: 'Ctrl+Enter', description: 'Proceed to checkout' },
      { keys: 'Ctrl+K', description: 'Clear cart' },
      { keys: 'Delete', description: 'Remove selected cart item' },
      { keys: 'Esc', description: 'Close modal/scanner' },
    ]);
  });
});
