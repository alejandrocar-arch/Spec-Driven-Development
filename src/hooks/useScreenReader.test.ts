/**
 * Tests for useScreenReader hook
 * Validates screen reader announcement functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenReader, useCartAnnouncements } from './useScreenReader';

describe('useScreenReader', () => {
  beforeEach(() => {
    // Clean up any existing announcement regions
    document.querySelectorAll('[role="status"], [role="alert"]').forEach((el) => {
      el.remove();
    });
  });

  afterEach(() => {
    // Clean up after each test
    document.querySelectorAll('[role="status"], [role="alert"]').forEach((el) => {
      el.remove();
    });
  });

  it('creates announcement regions on mount', () => {
    renderHook(() => useScreenReader());

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    const assertiveRegion = document.querySelector('[role="alert"][aria-live="assertive"]');

    expect(politeRegion).toBeTruthy();
    expect(assertiveRegion).toBeTruthy();
  });

  it('announces polite messages', async () => {
    const { result } = renderHook(() => useScreenReader());

    act(() => {
      result.current('Test message', 'polite');
    });

    // Wait for the timeout in the announce function
    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toBe('Test message');
  });

  it('announces assertive messages', async () => {
    const { result } = renderHook(() => useScreenReader());

    act(() => {
      result.current('Urgent message', 'assertive');
    });

    // Wait for the timeout in the announce function
    await new Promise((resolve) => setTimeout(resolve, 150));

    const assertiveRegion = document.querySelector('[role="alert"][aria-live="assertive"]');
    expect(assertiveRegion?.textContent).toBe('Urgent message');
  });

  it('defaults to polite announcements', async () => {
    const { result } = renderHook(() => useScreenReader());

    act(() => {
      result.current('Default message');
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toBe('Default message');
  });

  it('cleans up announcement regions on unmount', () => {
    const { unmount } = renderHook(() => useScreenReader());

    expect(document.querySelector('[role="status"]')).toBeTruthy();
    expect(document.querySelector('[role="alert"]')).toBeTruthy();

    unmount();

    expect(document.querySelector('[role="status"]')).toBeFalsy();
    expect(document.querySelector('[role="alert"]')).toBeFalsy();
  });
});

describe('useCartAnnouncements', () => {
  beforeEach(() => {
    document.querySelectorAll('[role="status"], [role="alert"]').forEach((el) => {
      el.remove();
    });
  });

  afterEach(() => {
    document.querySelectorAll('[role="status"], [role="alert"]').forEach((el) => {
      el.remove();
    });
  });

  it('announces when items are added to cart', async () => {
    const initialCart: Array<{ id: string; product: { name: string }; quantity: number }> = [];
    const { rerender } = renderHook(
      ({ cart, total }) => useCartAnnouncements(cart, total),
      {
        initialProps: { cart: initialCart, total: 0 },
      }
    );

    const updatedCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 2 },
    ];

    rerender({ cart: updatedCart, total: 200 });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toContain('Apple');
    expect(politeRegion?.textContent).toContain('added to cart');
  });

  it('announces when items are removed from cart', async () => {
    const initialCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 2 },
    ];
    const { rerender } = renderHook(
      ({ cart, total }) => useCartAnnouncements(cart, total),
      {
        initialProps: { cart: initialCart, total: 200 },
      }
    );

    rerender({ cart: [], total: 0 });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toContain('Apple');
    expect(politeRegion?.textContent).toContain('removed from cart');
  });

  it('announces when quantity changes', async () => {
    const initialCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 2 },
    ];
    const { rerender } = renderHook(
      ({ cart, total }) => useCartAnnouncements(cart, total),
      {
        initialProps: { cart: initialCart, total: 200 },
      }
    );

    const updatedCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 5 },
    ];

    rerender({ cart: updatedCart, total: 500 });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toContain('Apple');
    expect(politeRegion?.textContent).toContain('quantity updated to 5');
  });

  it('announces total changes when significant', async () => {
    const initialCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 1 },
    ];
    const { rerender } = renderHook(
      ({ cart, total }) => useCartAnnouncements(cart, total),
      {
        initialProps: { cart: initialCart, total: 100 },
      }
    );

    rerender({ cart: initialCart, total: 500 });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).toContain('Cart total');
    expect(politeRegion?.textContent).toContain('5.00');
  });

  it('does not announce insignificant total changes', async () => {
    const initialCart = [
      { id: '1', product: { name: 'Apple' }, quantity: 1 },
    ];
    const { rerender } = renderHook(
      ({ cart, total }) => useCartAnnouncements(cart, total),
      {
        initialProps: { cart: initialCart, total: 100 },
      }
    );

    rerender({ cart: initialCart, total: 105 }); // Only 5 cents difference

    await new Promise((resolve) => setTimeout(resolve, 150));

    const politeRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(politeRegion?.textContent).not.toContain('Cart total');
  });
});
