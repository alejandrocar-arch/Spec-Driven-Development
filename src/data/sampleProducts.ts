/**
 * Sample product data for development and testing
 */

import type { Product } from '../types';

export const sampleProducts: Product[] = [
  {
    id: '1',
    barcode: '7501234567890',
    name: 'Apple - Red Delicious',
    category: 'Fruits',
    price: 299, // $2.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '2',
    barcode: '7501234567891',
    name: 'Banana - Organic',
    category: 'Fruits',
    price: 149, // $1.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '3',
    barcode: '7501234567892',
    name: 'Milk - Whole 1 Gallon',
    category: 'Dairy',
    price: 449, // $4.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '4',
    barcode: '7501234567893',
    name: 'Bread - Whole Wheat',
    category: 'Bakery',
    price: 299, // $2.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '5',
    barcode: '7501234567894',
    name: 'Eggs - Large Dozen',
    category: 'Dairy',
    price: 399, // $3.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '6',
    barcode: '7501234567895',
    name: 'Orange Juice - 64oz',
    category: 'Beverages',
    price: 549, // $5.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '7',
    barcode: '7501234567896',
    name: 'Chicken Breast - 1lb',
    category: 'Meat',
    price: 699, // $6.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '8',
    barcode: '7501234567897',
    name: 'Tomatoes - Roma 1lb',
    category: 'Vegetables',
    price: 249, // $2.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '9',
    barcode: '7501234567898',
    name: 'Lettuce - Iceberg',
    category: 'Vegetables',
    price: 199, // $1.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '10',
    barcode: '7501234567899',
    name: 'Cheese - Cheddar 8oz',
    category: 'Dairy',
    price: 449, // $4.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '11',
    barcode: '7501234567800',
    name: 'Pasta - Spaghetti 1lb',
    category: 'Pantry',
    price: 199, // $1.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '12',
    barcode: '7501234567801',
    name: 'Rice - White 2lb',
    category: 'Pantry',
    price: 349, // $3.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '13',
    barcode: '7501234567802',
    name: 'Coffee - Ground 12oz',
    category: 'Beverages',
    price: 899, // $8.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '14',
    barcode: '7501234567803',
    name: 'Cereal - Corn Flakes',
    category: 'Breakfast',
    price: 449, // $4.49
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
  {
    id: '15',
    barcode: '7501234567804',
    name: 'Yogurt - Greek 32oz',
    category: 'Dairy',
    price: 599, // $5.99
    taxRate: 0.08,
    lastUpdated: Date.now(),
  },
];

/**
 * Load sample products into IndexedDB
 * This is useful for development and testing
 */
export async function loadSampleProducts(db: any): Promise<void> {
  try {
    const existingProducts = await db.getAllProducts();
    if (existingProducts.length === 0) {
      await db.upsertProducts(sampleProducts);
      console.log('✅ Loaded', sampleProducts.length, 'sample products into IndexedDB');
    } else {
      console.log('ℹ️ Products already exist in IndexedDB, skipping sample data load');
    }
  } catch (error) {
    console.error('❌ Failed to load sample products:', error);
  }
}
