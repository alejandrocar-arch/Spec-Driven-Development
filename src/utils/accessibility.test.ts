/**
 * Tests for accessibility utilities
 * Validates color contrast calculations and ARIA helpers
 */

import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validatePOSColors,
  formatCurrencyForScreenReader,
  formatQuantityForScreenReader,
  createCartItemLabel,
  createDiscountLabel,
} from './accessibility';

describe('Color Contrast', () => {
  describe('getContrastRatio', () => {
    it('calculates correct contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('calculates correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('calculates correct contrast ratio for gray on white', () => {
      const ratio = getContrastRatio('#767676', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5); // Should meet WCAG AA
    });

    it('throws error for invalid color format', () => {
      expect(() => getContrastRatio('invalid', '#FFFFFF')).toThrow();
    });
  });

  describe('meetsWCAGAA', () => {
    it('returns true for black text on white background', () => {
      expect(meetsWCAGAA('#000000', '#FFFFFF')).toBe(true);
    });

    it('returns false for light gray text on white background', () => {
      expect(meetsWCAGAA('#CCCCCC', '#FFFFFF')).toBe(false);
    });

    it('uses lower threshold for large text', () => {
      // A color that meets AA for large text but not normal text
      const result = meetsWCAGAA('#949494', '#FFFFFF', true);
      expect(result).toBe(true);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('returns true for black text on white background', () => {
      expect(meetsWCAGAAA('#000000', '#FFFFFF')).toBe(true);
    });

    it('returns false for medium gray text on white background', () => {
      expect(meetsWCAGAAA('#767676', '#FFFFFF')).toBe(false);
    });
  });

  describe('validatePOSColors', () => {
    it('validates all POS color combinations', () => {
      const results = validatePOSColors();
      
      expect(results.length).toBeGreaterThan(0);
      
      // All combinations should have required properties
      results.forEach((result) => {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('foreground');
        expect(result).toHaveProperty('background');
        expect(result).toHaveProperty('ratio');
        expect(result).toHaveProperty('meetsAA');
        expect(result).toHaveProperty('meetsAAA');
      });
    });

    it('ensures all color combinations meet WCAG AA', () => {
      const results = validatePOSColors();
      const failures = results.filter((r) => !r.meetsAA);
      
      if (failures.length > 0) {
        console.warn('Color combinations that do not meet WCAG AA:');
        failures.forEach((f) => {
          console.warn(`  ${f.name}: ${f.ratio.toFixed(2)}:1`);
        });
      }
      
      // All combinations should meet WCAG AA
      expect(failures.length).toBe(0);
    });
  });
});

describe('Screen Reader Formatting', () => {
  describe('formatCurrencyForScreenReader', () => {
    it('formats whole dollars', () => {
      expect(formatCurrencyForScreenReader(100)).toBe('1 dollar');
      expect(formatCurrencyForScreenReader(200)).toBe('2 dollars');
      expect(formatCurrencyForScreenReader(1000)).toBe('10 dollars');
    });

    it('formats dollars and cents', () => {
      expect(formatCurrencyForScreenReader(150)).toBe('1 dollar and 50 cents');
      expect(formatCurrencyForScreenReader(250)).toBe('2 dollars and 50 cents');
      expect(formatCurrencyForScreenReader(101)).toBe('1 dollar and 1 cent');
    });

    it('handles zero dollars', () => {
      expect(formatCurrencyForScreenReader(0)).toBe('0 dollars');
      expect(formatCurrencyForScreenReader(50)).toBe('0 dollars and 50 cents');
    });
  });

  describe('formatQuantityForScreenReader', () => {
    it('formats singular quantity', () => {
      expect(formatQuantityForScreenReader(1, 'Apple')).toBe('1 Apple');
    });

    it('formats plural quantity', () => {
      expect(formatQuantityForScreenReader(2, 'Apple')).toBe('2 Apples');
      expect(formatQuantityForScreenReader(10, 'Orange')).toBe('10 Oranges');
    });
  });

  describe('createCartItemLabel', () => {
    it('creates accessible label for cart item', () => {
      const label = createCartItemLabel('Apple', 2, 300);
      expect(label).toBe('2 Apples, total 3 dollars');
    });

    it('handles singular quantity', () => {
      const label = createCartItemLabel('Banana', 1, 150);
      expect(label).toBe('1 Banana, total 1 dollar and 50 cents');
    });
  });

  describe('createDiscountLabel', () => {
    it('creates label for percentage discount on item', () => {
      const label = createDiscountLabel('percentage', 10, 'item');
      expect(label).toBe('10 percent off applied to item');
    });

    it('creates label for fixed discount on cart', () => {
      const label = createDiscountLabel('fixed', 500, 'cart');
      expect(label).toBe('5 dollars off applied to cart');
    });

    it('creates label for percentage discount on cart', () => {
      const label = createDiscountLabel('percentage', 25, 'cart');
      expect(label).toBe('25 percent off applied to cart');
    });
  });
});
