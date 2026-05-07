/**
 * KeyboardShortcutsHelp component
 * Displays a modal with all available keyboard shortcuts.
 * 
 * Requirements: 11.3
 */

import React from 'react';
import { getKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  /** Whether the help modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = getKeyboardShortcuts();

  // Close on Esc key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2
            id="shortcuts-title"
            className="text-lg font-semibold text-gray-900"
            style={{ fontSize: '16px' }}
          >
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts help"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4" style={{ fontSize: '14px' }}>
            Use these keyboard shortcuts to navigate the POS system efficiently:
          </p>

          <dl className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <dt className="text-sm text-gray-700" style={{ fontSize: '14px' }}>
                  {shortcut.description}
                </dt>
                <dd>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm">
                    {shortcut.keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            style={{ fontSize: '14px' }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
