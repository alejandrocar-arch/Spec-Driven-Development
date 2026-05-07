/**
 * ValidationError component tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ValidationError, useValidationError } from './ValidationError';

describe('ValidationError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays error message when visible', () => {
    render(
      <ValidationError
        message="Invalid barcode format"
        isVisible={true}
      />
    );

    expect(screen.getByText('Invalid barcode format')).toBeInTheDocument();
  });

  it('does not display when not visible', () => {
    render(
      <ValidationError
        message="Invalid barcode format"
        isVisible={false}
      />
    );

    expect(screen.queryByText('Invalid barcode format')).not.toBeInTheDocument();
  });

  it('displays error icon (Req 13.6)', () => {
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    
    // Check for SVG icon
    const svg = alert.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has red styling for visibility', () => {
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-50');
    expect(alert.className).toContain('border-red-200');
  });

  it('auto-dismisses after 5 seconds by default (Req 11.5)', async () => {
    const onDismiss = vi.fn();
    
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Fast-forward 5 seconds and run all timers
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();
    });

    expect(onDismiss).toHaveBeenCalled();
  });

  it('respects custom auto-dismiss duration', async () => {
    const onDismiss = vi.fn();
    
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
        autoDismissMs={3000}
        onDismiss={onDismiss}
      />
    );

    // Fast-forward 2 seconds (should not dismiss yet)
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Fast-forward another 1 second (total 3 seconds)
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
    });

    expect(onDismiss).toHaveBeenCalled();
  });

  it('can be manually dismissed', () => {
    const onDismiss = vi.fn();
    
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('clears auto-dismiss timer when manually dismissed', async () => {
    const onDismiss = vi.fn();
    
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
        onDismiss={onDismiss}
      />
    );

    // Manually dismiss
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Fast-forward time - should not call onDismiss again
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has accessible ARIA attributes', () => {
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('applies custom className', () => {
    render(
      <ValidationError
        message="Error message"
        isVisible={true}
        className="custom-class"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('custom-class');
  });

  it('resets when isVisible changes from false to true', () => {
    const { rerender } = render(
      <ValidationError
        message="Error message"
        isVisible={false}
      />
    );

    expect(screen.queryByText('Error message')).not.toBeInTheDocument();

    rerender(
      <ValidationError
        message="Error message"
        isVisible={true}
      />
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});

describe('useValidationError', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useValidationError());

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('sets error message', () => {
    const { result } = renderHook(() => useValidationError());

    act(() => {
      result.current.showError('Invalid input');
    });

    expect(result.current.error).toBe('Invalid input');
    expect(result.current.hasError).toBe(true);
  });

  it('clears error message', () => {
    const { result } = renderHook(() => useValidationError());

    act(() => {
      result.current.showError('Invalid input');
    });

    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('updates error message', () => {
    const { result } = renderHook(() => useValidationError());

    act(() => {
      result.current.showError('First error');
    });

    expect(result.current.error).toBe('First error');

    act(() => {
      result.current.showError('Second error');
    });

    expect(result.current.error).toBe('Second error');
  });
});
