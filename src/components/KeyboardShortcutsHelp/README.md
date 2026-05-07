# Keyboard Shortcuts Implementation

This directory contains the keyboard shortcuts help menu component for the POS Frontend application.

## Components

### KeyboardShortcutsHelp

A modal component that displays all available keyboard shortcuts to the user.

**Props:**
- `isOpen: boolean` - Controls whether the modal is visible
- `onClose: () => void` - Callback function when the modal is closed

**Features:**
- Displays all keyboard shortcuts in a clean, organized layout
- Can be closed by clicking the close button, "Got it!" button, backdrop, or pressing Esc
- Fully accessible with proper ARIA attributes
- Responsive design with Tailwind CSS

## Hook

### useKeyboardShortcuts

Located in `src/hooks/useKeyboardShortcuts.ts`, this hook manages keyboard shortcuts for the application.

**Supported Shortcuts:**
- `Ctrl+F` - Focus product search
- `Ctrl+B` - Focus barcode input
- `Ctrl+S` - Open camera scanner
- `Ctrl+Enter` - Proceed to checkout
- `Ctrl+K` - Clear cart
- `Delete` - Remove selected cart item
- `Esc` - Close modal/scanner

**Usage:**

```tsx
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

function MyComponent() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  useKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onFocusBarcode: () => barcodeInputRef.current?.focus(),
    onOpenScanner: () => setShowScanner(true),
    onCheckout: () => handleCheckout(),
    onClearCart: () => handleClearCart(),
    onRemoveItem: () => handleRemoveSelectedItem(),
    onCloseModal: () => setShowScanner(false),
  });
  
  // ... rest of component
}
```

## Integration Example

Here's a complete example of how to integrate keyboard shortcuts into your main application:

```tsx
import React, { useState, useRef } from 'react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { ProductSearch } from './components/ProductSearch';
import { ShoppingCart } from './components/ShoppingCart';
import { usePOSStore } from './store/posStore';

export function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const clearCart = usePOSStore((s) => s.clearCart);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const cart = usePOSStore((s) => s.cart);
  
  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onFocusBarcode: () => barcodeInputRef.current?.focus(),
    onOpenScanner: () => setShowScanner(true),
    onCheckout: () => {
      if (cart.length > 0) {
        // Navigate to checkout
        console.log('Proceeding to checkout...');
      }
    },
    onClearCart: () => {
      if (cart.length > 0 && confirm('Clear all items from cart?')) {
        clearCart();
      }
    },
    onRemoveItem: () => {
      if (selectedItemId) {
        removeFromCart(selectedItemId);
        setSelectedItemId(null);
      }
    },
    onCloseModal: () => {
      setShowScanner(false);
      setShowHelp(false);
    },
  });
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">POS System</h1>
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            aria-label="Show keyboard shortcuts"
          >
            ⌨️ Shortcuts
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductSearch
            onProductSelect={(product) => console.log('Selected:', product)}
          />
          <ShoppingCart />
        </div>
      </main>
      
      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
```

## Testing

The implementation includes comprehensive unit tests:

- `useKeyboardShortcuts.test.ts` - Tests for the keyboard shortcuts hook
- `KeyboardShortcutsHelp.test.tsx` - Tests for the help modal component

Run tests with:

```bash
npm test -- useKeyboardShortcuts KeyboardShortcutsHelp
```

## Accessibility

The keyboard shortcuts implementation follows accessibility best practices:

- All shortcuts work with both `Ctrl` (Windows/Linux) and `Cmd` (Mac)
- Shortcuts don't interfere with typing in input fields (except `Esc`)
- The help modal has proper ARIA attributes
- Keyboard navigation is fully supported
- Visual feedback is provided for all interactions

## Requirements

This implementation satisfies **Requirement 11.3** from the POS Frontend specification:

> THE POS_System SHALL support keyboard shortcuts for common operations (add product, checkout, clear cart)
