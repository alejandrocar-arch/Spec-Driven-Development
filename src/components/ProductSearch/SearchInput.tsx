/**
 * SearchInput component
 * Text input with 300ms debounce for product name/category search.
 * Minimum 2 characters required to trigger search.
 * Keyboard shortcut: Ctrl+F to focus.
 */

import React, { useRef, useEffect, useCallback } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  isSearching,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <span
        className="absolute left-3 text-gray-400 pointer-events-none"
        aria-hidden="true"
      >
        🔍
      </span>

      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label="Search products by name or category"
        aria-busy={isSearching}
        placeholder="Search products (min. 2 characters)…"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        style={{ minHeight: '40px', fontSize: '14px' }}
      />

      {/* Loading spinner */}
      {isSearching && (
        <span
          className="absolute right-3 text-blue-500 animate-spin"
          aria-label="Searching…"
        >
          ⟳
        </span>
      )}

      {/* Clear button */}
      {!isSearching && value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          ✕
        </button>
      )}
    </div>
  );
};
