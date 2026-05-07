/**
 * ErrorBoundary component
 * Catches unhandled React errors, preserves cart state, and displays user-friendly messages.
 * 
 * Implements task 21.1
 * Requirements: 13.1, 13.2, 13.3
 */

import React, { Component, type ReactNode } from 'react';
import { usePOSStore } from '../../store/posStore';
import { backupCartState } from '../../services/init/appInitializer';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

/**
 * Error Boundary Component
 * 
 * Catches unhandled exceptions in React component tree and displays
 * a user-friendly error message while preserving cart state.
 * 
 * Requirements:
 * - 13.1: Display user-friendly error message
 * - 13.2: Log error details for troubleshooting
 * - 13.3: Preserve cart state before crash
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Requirement 13.2: Log error details for troubleshooting
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    console.error('Error ID:', this.state.errorId);
    console.error('Component stack:', errorInfo.componentStack);

    // Requirement 13.3: Preserve cart state before crash
    try {
      const store = usePOSStore.getState();
      backupCartState(store.cart, store.cartDiscounts);
      console.log('Cart state backed up successfully');
    } catch (backupError) {
      console.error('Failed to backup cart state:', backupError);
    }

    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReportIssue = (): void => {
    const { error, errorId, errorInfo } = this.state;
    
    // Prepare error report
    const report = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Log to console for now (in production, this would send to error tracking service)
    console.log('Error Report:', JSON.stringify(report, null, 2));
    
    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please send this to technical support.');
      })
      .catch(() => {
        alert(`Error ID: ${errorId}\nPlease report this to technical support.`);
      });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Requirement 13.1: Display user-friendly error message
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-4">
              The application encountered an unexpected error. Your cart has been saved and will be restored when you reload.
            </p>
            
            <div className="bg-gray-50 rounded p-3 mb-4">
              <p className="text-sm text-gray-700 font-mono">
                Error ID: {this.state.errorId}
              </p>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
              
              <button
                onClick={this.handleReportIssue}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Report Issue
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Developer Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-red-600">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
