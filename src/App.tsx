/**
 * Main App component for the POS Frontend
 * Orchestrates all major components and provides the main layout
 */

import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ProductSearch } from './components/ProductSearch/ProductSearch';
import { ShoppingCart } from './components/ShoppingCart/ShoppingCart';
import { ConnectedCheckoutPanel } from './components/Checkout/ConnectedCheckoutPanel';
import { ConnectedTransactionHistory } from './components/TransactionHistory/ConnectedTransactionHistory';
import { NetworkStatusCompact } from './components/NetworkStatus/NetworkStatus';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { Product } from './types';

// Import styles
import './index.css';
import './styles/accessibility.css';
import './styles/button-feedback.css';
import './styles/transitions.css';

export const App: React.FC = () => {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('[role="searchbox"]');
      searchInput?.focus();
    },
    onFocusBarcode: () => {
      const barcodeInput = document.querySelector<HTMLInputElement>('[aria-label*="barcode"]');
      barcodeInput?.focus();
    },
    onOpenScanner: () => setShowScanner(true),
    onCloseModal: () => {
      setShowScanner(false);
      setShowShortcutsHelp(false);
    },
  });

  const handleProductSelect = (product: Product) => {
    console.log('Product selected:', product.name);
  };

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        {/* Header */}
        <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                🛒 Supermarket POS
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>Point of Sale System</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <NetworkStatusCompact />
              
              <button
                onClick={() => setShowShortcutsHelp(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '14px', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}
                aria-label="Show keyboard shortcuts"
              >
                ⌨️ Shortcuts
              </button>
              
              <ConnectedTransactionHistory />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
            {/* Left Column: Product Search */}
            <div>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '16px' }}>
                  Product Search
                </h2>
                <ProductSearch onProductSelect={handleProductSelect} />
              </div>
            </div>

            {/* Right Column: Shopping Cart & Checkout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '16px' }}>
                  Shopping Cart
                </h2>
                <ShoppingCart />
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '16px' }}>
                  Checkout
                </h2>
                <ConnectedCheckoutPanel />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', marginTop: '32px', padding: '16px 24px' }}>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            POS Frontend v1.0.0 | Built with React + TypeScript + Zustand
          </p>
        </footer>

        {/* Keyboard Shortcuts Help Modal */}
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
        />
      </div>
    </ErrorBoundary>
  );
};
