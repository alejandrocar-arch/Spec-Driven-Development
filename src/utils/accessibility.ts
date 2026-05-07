/**
 * Accessibility utilities
 * Provides color contrast checking and ARIA helpers.
 * 
 * Implements task 25.3: Verify color contrast ratios
 * Requirements: 11.6
 */

/**
 * Color contrast ratio calculation following WCAG 2.1 guidelines
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (e.g., #FFFFFF)');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * - Normal text: 7:1
 * - Large text: 4.5:1
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 4.5 : 7;
  return ratio >= threshold;
}

/**
 * Validate color combinations used in the POS system
 * Returns an array of validation results
 */
export interface ColorValidation {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  isLargeText: boolean;
}

export function validatePOSColors(): ColorValidation[] {
  const colorCombinations: Array<{
    name: string;
    foreground: string;
    background: string;
    isLargeText: boolean;
  }> = [
    // Primary text
    { name: 'Primary text', foreground: '#111827', background: '#FFFFFF', isLargeText: false },
    { name: 'Secondary text', foreground: '#6B7280', background: '#FFFFFF', isLargeText: false },
    
    // Buttons
    { name: 'Primary button', foreground: '#FFFFFF', background: '#2563EB', isLargeText: false },
    { name: 'Success button', foreground: '#FFFFFF', background: '#15803D', isLargeText: false }, // Darker green for better contrast
    { name: 'Danger button', foreground: '#FFFFFF', background: '#DC2626', isLargeText: false },
    
    // Status indicators
    { name: 'Error text', foreground: '#DC2626', background: '#FFFFFF', isLargeText: false },
    { name: 'Success text', foreground: '#15803D', background: '#FFFFFF', isLargeText: false }, // Darker green for better contrast
    { name: 'Warning text', foreground: '#B45309', background: '#FFFFFF', isLargeText: false }, // Darker amber for better contrast
    
    // Badges
    { name: 'Online badge', foreground: '#166534', background: '#DCFCE7', isLargeText: false },
    { name: 'Offline badge', foreground: '#991B1B', background: '#FEE2E2', isLargeText: false },
    { name: 'Warning badge', foreground: '#92400E', background: '#FEF3C7', isLargeText: false },
    
    // Interactive elements
    { name: 'Link text', foreground: '#2563EB', background: '#FFFFFF', isLargeText: false },
    { name: 'Focus ring', foreground: '#2563EB', background: '#FFFFFF', isLargeText: false }, // Use primary blue for better contrast
  ];

  return colorCombinations.map((combo) => {
    const ratio = getContrastRatio(combo.foreground, combo.background);
    return {
      ...combo,
      ratio,
      meetsAA: meetsWCAGAA(combo.foreground, combo.background, combo.isLargeText),
      meetsAAA: meetsWCAGAAA(combo.foreground, combo.background, combo.isLargeText),
    };
  });
}

/**
 * ARIA helpers
 */

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Format currency for screen readers
 * Converts "$12.50" to "12 dollars and 50 cents"
 */
export function formatCurrencyForScreenReader(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const centsRemainder = cents % 100;
  
  if (centsRemainder === 0) {
    return `${dollars} dollar${dollars !== 1 ? 's' : ''}`;
  }
  
  return `${dollars} dollar${dollars !== 1 ? 's' : ''} and ${centsRemainder} cent${centsRemainder !== 1 ? 's' : ''}`;
}

/**
 * Format quantity for screen readers
 */
export function formatQuantityForScreenReader(quantity: number, itemName: string): string {
  return `${quantity} ${itemName}${quantity !== 1 ? 's' : ''}`;
}

/**
 * Create accessible label for cart item
 */
export function createCartItemLabel(
  productName: string,
  quantity: number,
  lineTotal: number
): string {
  const quantityText = formatQuantityForScreenReader(quantity, productName);
  const priceText = formatCurrencyForScreenReader(lineTotal);
  return `${quantityText}, total ${priceText}`;
}

/**
 * Create accessible label for discount
 */
export function createDiscountLabel(
  type: 'percentage' | 'fixed',
  value: number,
  target: 'item' | 'cart'
): string {
  const discountText =
    type === 'percentage'
      ? `${value} percent off`
      : formatCurrencyForScreenReader(value) + ' off';
  const targetText = target === 'item' ? 'item' : 'cart';
  return `${discountText} applied to ${targetText}`;
}

/**
 * Keyboard navigation helpers
 */

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
  
  for (let i = 0; i < focusableTags.length; i++) {
    if (focusableTags[i] === tagName) return true;
  }
  if (element.tabIndex >= 0) return true;
  
  return false;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  const elements = container.querySelectorAll<HTMLElement>(selector);
  const result: HTMLElement[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    if (!elements[i].hasAttribute('aria-hidden')) {
      result.push(elements[i]);
    }
  }
  
  return result;
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}
