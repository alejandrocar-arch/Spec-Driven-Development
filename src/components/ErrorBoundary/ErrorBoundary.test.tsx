/**
 * ErrorBoundary component tests
 * Tests error catching, cart state preservation, and user interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { usePOSStore } from '../../store/posStore';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Reset store
    usePOSStore.setState({
      cart: [],
      cartDiscounts: [],
      products: [],
      productIndex: new Map(),
      lastSync: null,
      transactions: [],
      currentTransaction: null,
      isOnline: true,
      isSyncing: false,
      error: null,
    });

    // Clear console mocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches errors and displays error UI (Req 13.1)', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText(/your cart has been saved/i)).toBeInTheDocument();
  });

  it('displays error ID for troubleshooting (Req 13.2)', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('logs error details to console (Req 13.2)', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls.some(call => 
      call[0]?.includes('ErrorBoundary caught an error')
    )).toBe(true);
  });

  it('provides reload button', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload application/i });
    expect(reloadButton).toBeInTheDocument();
    
    fireEvent.click(reloadButton);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('provides report issue button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reportButton = screen.getByRole('button', { name: /report issue/i });
    expect(reportButton).toBeInTheDocument();
  });

  it('attempts to backup cart state when error occurs (Req 13.3)', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Set up cart state
    usePOSStore.setState({
      cart: [
        {
          id: '1',
          product: {
            id: 'p1',
            barcode: '123456789012',
            name: 'Test Product',
            category: 'Test',
            price: 100,
            taxRate: 0.08,
            lastUpdated: Date.now(),
          },
          quantity: 2,
          lineTotal: 200,
        },
      ],
      cartDiscounts: [],
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check that backup was attempted
    expect(consoleLogSpy.mock.calls.some(call => 
      call[0]?.includes('Cart state backed up successfully')
    )).toBe(true);
  });

  it('handles backup failure gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock localStorage to throw error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage full');
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should still display error UI even if backup fails
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    
    // Restore original
    Storage.prototype.setItem = originalSetItem;
  });
});
