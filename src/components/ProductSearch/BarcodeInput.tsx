/**
 * BarcodeInput component
 * Numeric input for manual barcode entry (EAN-13 / UPC-A).
 * Validates format on Enter key, then looks up product via store.
 * Keyboard shortcut: Ctrl+B to focus.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface BarcodeInputProps {
  onBarcodeLookup: (barcode: string) => void;
  isOnline: boolean;
  disabled?: boolean;
}

/** Validate barcode: must be exactly 12 (UPC-A) or 13 (EAN-13) digits */
function isValidBarcode(value: string): boolean {
  return /^\d{12,13}$/.test(value);
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  onBarcodeLookup,
  isOnline,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Ctrl+B keyboard shortcut to focus barcode input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, '');
    setValue(digits);
    if (error) setError(null);
  }, [error]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const trimmed = value.trim();
      if (!trimmed) return;

      if (!isValidBarcode(trimmed)) {
        setError('Invalid barcode: must be 12 (UPC-A) or 13 (EAN-13) digits.');
        return;
      }

      onBarcodeLookup(trimmed);
      setValue('');
    },
    [value, onBarcodeLookup]
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex items-center">
        {/* Barcode icon */}
        <span
          className="absolute left-3 text-gray-400 pointer-events-none"
          aria-hidden="true"
        >
          ▦
        </span>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          aria-label="Enter product barcode (EAN-13 or UPC-A)"
          aria-describedby={error ? 'barcode-error' : undefined}
          placeholder="Barcode (12 or 13 digits) + Enter…"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={13}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{ minHeight: '40px', fontSize: '14px' }}
        />

        {/* Offline badge */}
        {!isOnline && (
          <span
            className="absolute right-3 text-xs text-amber-600 font-medium"
            aria-label="Offline – using local database"
          >
            OFFLINE
          </span>
        )}
      </div>

      {/* Validation error */}
      {error && (
        <p
          id="barcode-error"
          role="alert"
          className="text-sm text-red-600 flex items-center gap-1"
          style={{ fontSize: '14px' }}
        >
          ❌ {error}
        </p>
      )}
    </div>
  );
};
