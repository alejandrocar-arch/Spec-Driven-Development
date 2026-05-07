/**
 * Unit tests for KeyboardShortcutsHelp component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={false} onClose={onClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Keyboard Shortcuts/i })).toBeInTheDocument();
  });

  it('should display all keyboard shortcuts', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Focus product search')).toBeInTheDocument();
    expect(screen.getByText('Focus barcode input')).toBeInTheDocument();
    expect(screen.getByText('Open camera scanner')).toBeInTheDocument();
    expect(screen.getByText('Proceed to checkout')).toBeInTheDocument();
    expect(screen.getByText('Clear cart')).toBeInTheDocument();
    expect(screen.getByText('Remove selected cart item')).toBeInTheDocument();
    expect(screen.getByText('Close modal/scanner')).toBeInTheDocument();

    expect(screen.getByText('Ctrl+F')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+B')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Enter')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close shortcuts help');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when "Got it!" button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const gotItButton = screen.getByText('Got it!');
    fireEvent.click(gotItButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const modalContent = screen.getByText(/Use these keyboard shortcuts/i);
    fireEvent.click(modalContent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-title');

    const title = screen.getByRole('heading', { name: /Keyboard Shortcuts/i });
    expect(title).toHaveAttribute('id', 'shortcuts-title');
  });

  it('should display shortcuts in a definition list', () => {
    const onClose = vi.fn();
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={true} onClose={onClose} />
    );

    const dl = container.querySelector('dl');
    expect(dl).toBeInTheDocument();

    const dts = container.querySelectorAll('dt');
    const dds = container.querySelectorAll('dd');
    expect(dts.length).toBe(7);
    expect(dds.length).toBe(7);
  });

  it('should use kbd elements for keyboard keys', () => {
    const onClose = vi.fn();
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={true} onClose={onClose} />
    );

    const kbdElements = container.querySelectorAll('kbd');
    expect(kbdElements.length).toBe(7);
  });
});
