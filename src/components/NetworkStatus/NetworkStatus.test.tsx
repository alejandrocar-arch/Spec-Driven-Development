/**
 * NetworkStatus component tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetworkStatus, NetworkStatusCompact } from './NetworkStatus';
import { usePOSStore } from '../../store/posStore';
import type { Transaction } from '../../types';

const makeTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  id: 'tx1',
  timestamp: Date.now(),
  items: [],
  subtotal: 1000,
  cartDiscount: 0,
  taxAmount: 80,
  total: 1080,
  payment: { method: 'cash', amountTendered: 1100, changeDue: 20 },
  receipt: {
    transactionId: 'tx1',
    storeName: 'Test Store',
    storeAddress: '123 Main St',
    timestamp: Date.now(),
    items: [],
    subtotal: 1000,
    discounts: 0,
    tax: 80,
    total: 1080,
    payment: { method: 'cash', amountTendered: 1100, changeDue: 20 },
  },
  syncStatus: 'pending',
  ...overrides,
});

describe('NetworkStatus', () => {
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
  });

  describe('Online and synced state', () => {
    it('shows minimal online indicator when fully synced (Req 9.2)', () => {
      usePOSStore.setState({
        isOnline: true,
        isSyncing: false,
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('displays last sync time (Req 10.7)', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      usePOSStore.setState({
        isOnline: true,
        lastSync: fiveMinutesAgo,
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/Synced 5m ago/i)).toBeInTheDocument();
    });
  });

  describe('Offline state', () => {
    it('displays offline indicator (Req 9.2, 9.10)', () => {
      usePOSStore.setState({
        isOnline: false,
      });

      render(<NetworkStatus />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows message about pending sync when offline', () => {
      usePOSStore.setState({
        isOnline: false,
      });

      render(<NetworkStatus />);

      expect(
        screen.getByText(/transactions will sync when connection is restored/i)
      ).toBeInTheDocument();
    });
  });

  describe('Syncing state', () => {
    it('displays syncing indicator', () => {
      usePOSStore.setState({
        isOnline: true,
        isSyncing: true,
      });

      render(<NetworkStatus />);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('shows spinning icon when syncing', () => {
      usePOSStore.setState({
        isOnline: true,
        isSyncing: true,
      });

      render(<NetworkStatus />);

      const syncText = screen.getByText('Syncing...');
      const svg = syncText.previousElementSibling;
      expect(svg?.classList.contains('animate-spin')).toBe(true);
    });
  });

  describe('Pending transactions', () => {
    it('displays count of pending transactions', () => {
      const pendingTx1 = makeTransaction({ id: 'tx1', syncStatus: 'pending' });
      const pendingTx2 = makeTransaction({ id: 'tx2', syncStatus: 'pending' });
      const syncedTx = makeTransaction({ id: 'tx3', syncStatus: 'synced' });

      usePOSStore.setState({
        transactions: [pendingTx1, pendingTx2, syncedTx],
      });

      render(<NetworkStatus />);

      expect(screen.getByText('2 transactions pending sync')).toBeInTheDocument();
    });

    it('uses singular form for one pending transaction', () => {
      const pendingTx = makeTransaction({ syncStatus: 'pending' });

      usePOSStore.setState({
        transactions: [pendingTx],
      });

      render(<NetworkStatus />);

      expect(screen.getByText('1 transaction pending sync')).toBeInTheDocument();
    });

    it('does not show pending count when zero', () => {
      usePOSStore.setState({
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.queryByText(/pending sync/i)).not.toBeInTheDocument();
    });
  });

  describe('Last sync formatting', () => {
    it('shows "Just now" for recent sync', () => {
      usePOSStore.setState({
        isOnline: true,
        lastSync: Date.now() - 30000, // 30 seconds ago
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/Just now/i)).toBeInTheDocument();
    });

    it('shows minutes for sync within last hour', () => {
      usePOSStore.setState({
        isOnline: true,
        lastSync: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/15m ago/i)).toBeInTheDocument();
    });

    it('shows hours for sync within last day', () => {
      usePOSStore.setState({
        isOnline: true,
        lastSync: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/3h ago/i)).toBeInTheDocument();
    });

    it('shows days for older syncs', () => {
      usePOSStore.setState({
        isOnline: true,
        lastSync: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        transactions: [],
      });

      render(<NetworkStatus />);

      expect(screen.getByText(/2d ago/i)).toBeInTheDocument();
    });
  });
});

describe('NetworkStatusCompact', () => {
  beforeEach(() => {
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
  });

  it('shows online badge when connected', () => {
    usePOSStore.setState({ isOnline: true });

    render(<NetworkStatusCompact />);

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows offline badge when disconnected', () => {
    usePOSStore.setState({ isOnline: false });

    render(<NetworkStatusCompact />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows sync badge when syncing', () => {
    usePOSStore.setState({
      isOnline: true,
      isSyncing: true,
    });

    render(<NetworkStatusCompact />);

    expect(screen.getByText('Sync')).toBeInTheDocument();
  });

  it('shows pending count badge', () => {
    const pendingTx1 = makeTransaction({ id: 'tx1', syncStatus: 'pending' });
    const pendingTx2 = makeTransaction({ id: 'tx2', syncStatus: 'pending' });

    usePOSStore.setState({
      transactions: [pendingTx1, pendingTx2],
    });

    render(<NetworkStatusCompact />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show pending badge when zero', () => {
    usePOSStore.setState({
      transactions: [],
    });

    render(<NetworkStatusCompact />);

    // Should only show online badge
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<NetworkStatusCompact className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
