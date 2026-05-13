

<img width="1056" height="617" alt="image" src="https://github.com/user-attachments/assets/26bd4cf9-a60e-4d2c-93ce-d294395e136f" />




# 🛒 Supermarket POS Frontend

A modern, offline-first Point of Sale (POS) system built with React, TypeScript, and Zustand. Designed for supermarket checkout operations with full offline support, accessibility features, and real-time synchronization.

## ✨ Features

### Core Functionality
- **Product Search**: Fast search by name, category, or barcode with virtual scrolling
- **Barcode Scanning**: Manual input and camera-based barcode scanning
- **Shopping Cart**: Real-time cart management with quantity updates and item removal
- **Checkout**: Multiple payment methods (cash, credit, debit) with receipt generation
- **Transaction History**: View and search past transactions

### Offline-First Architecture
- **IndexedDB Storage**: All products stored locally for offline access
- **Offline Queue**: Queues transactions, emails, and print jobs when offline
- **Background Sync**: Automatic synchronization when connection is restored
- **Connectivity Monitoring**: Real-time network status with visual indicators

### Accessibility (WCAG 2.1 AA Compliant)
- **Keyboard Navigation**: Full keyboard support with shortcuts
- **Screen Reader Support**: ARIA labels and live announcements
- **High Contrast**: 4.5:1 minimum contrast ratio
- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Font Sizes**: Minimum 14px for all text

### Performance Optimizations
- **Virtual Scrolling**: Efficient rendering of large product lists
- **Debounced Search**: 300ms debounce for search input
- **Memoized Calculations**: Optimized cart total calculations
- **Lazy Loading**: Progressive loading of search results

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with IndexedDB support

### Installation

```bash
# Navigate to project directory
cd pos-frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at **http://localhost:5173/**

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# Store Information
VITE_STORE_NAME=Supermarket
VITE_STORE_ADDRESS=123 Main St, City, State 12345
```

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:properties # Run property-based tests

# Code Quality
npm run lint         # Run ESLint
```

## 🏗️ Project Structure

```
pos-frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Checkout/        # Payment and checkout
│   │   ├── ErrorBoundary/   # Error handling
│   │   ├── KeyboardShortcutsHelp/
│   │   ├── NetworkStatus/   # Connectivity indicator
│   │   ├── ProductSearch/   # Search and barcode scanning
│   │   ├── ShoppingCart/    # Cart management
│   │   ├── SuccessMessage/  # Toast notifications
│   │   ├── TransactionHistory/
│   │   └── ValidationError/ # Form validation
│   ├── hooks/               # Custom React hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useScreenReader.ts
│   ├── services/            # Business logic
│   │   ├── api/             # API client
│   │   ├── database/        # IndexedDB wrapper
│   │   ├── init/            # App initialization
│   │   ├── queue/           # Offline queue
│   │   └── sync/            # Sync scheduler
│   ├── store/               # Zustand state management
│   │   └── posStore.ts
│   ├── styles/              # CSS files
│   │   ├── accessibility.css
│   │   ├── button-feedback.css
│   │   └── transitions.css
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── accessibility.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.cjs
└── postcss.config.cjs
```

## 🎯 Key Technologies

- **React 18**: UI framework with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **Dexie.js**: IndexedDB wrapper for offline storage
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Unit testing framework
- **Fast-Check**: Property-based testing
- **html5-qrcode**: Camera barcode scanning

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + F` | Focus search input |
| `Ctrl + B` | Focus barcode input |
| `Ctrl + S` | Open camera scanner |
| `Ctrl + C` | Clear cart |
| `Ctrl + P` | Complete checkout |
| `Esc` | Close modals |
| `?` | Show keyboard shortcuts help |

## 🔄 Offline Mode

The application is designed to work seamlessly offline:

1. **Products**: Loaded from IndexedDB on startup
2. **Cart Operations**: All local, no network required
3. **Transactions**: Queued locally when offline
4. **Automatic Sync**: Syncs when connection is restored
5. **Visual Indicators**: Clear offline/online status

### Sample Data

On first launch, the app automatically loads 15 sample products into IndexedDB for testing:
- Fruits (apples, bananas)
- Dairy (milk, eggs, cheese, yogurt)
- Bakery (bread)
- Meat (chicken)
- Vegetables (tomatoes, lettuce)
- Pantry (pasta, rice)
- Beverages (orange juice, coffee)
- Breakfast (cereal)

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Component and service tests
- **Integration Tests**: Store and API integration
- **Property-Based Tests**: Correctness properties with Fast-Check
- **Accessibility Tests**: WCAG compliance checks

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run property-based tests
npm run test:properties
```

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with IndexedDB support

## 🔐 Security Considerations

- **No Sensitive Data in Frontend**: Card details are masked (last 4 digits only)
- **Environment Variables**: API keys and config in `.env` (not committed)
- **Input Validation**: All user inputs validated
- **XSS Protection**: React's built-in escaping

## 🚧 Known Limitations

- **Backend Required**: Full functionality requires a backend API (not included)
- **Camera Permissions**: Barcode scanning requires camera access
- **IndexedDB**: Requires browser support (not available in private/incognito mode in some browsers)

## 📄 License

This project is part of a POS system implementation. See the main repository for license information.

## 🤝 Contributing

This project follows the spec-driven development methodology. See `.kiro/specs/pos-frontend/` for:
- `requirements.md`: Feature requirements
- `design.md`: Technical design
- `tasks.md`: Implementation tasks

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Verify IndexedDB is enabled
3. Check network connectivity for sync issues
4. Review the error logs (Error ID provided in error messages)

## 🎨 Accessibility

This application is designed to be accessible to all users:
- Full keyboard navigation
- Screen reader compatible
- High contrast mode support
- Reduced motion support
- Touch-friendly interface

For accessibility issues, please report with:
- Browser and version
- Assistive technology used
- Steps to reproduce

---

**Built with ❤️ using React, TypeScript, and modern web technologies**
