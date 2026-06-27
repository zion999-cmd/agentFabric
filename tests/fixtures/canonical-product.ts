// Canonical product/order fixture: single source of truth for golden vectors.
// Used by contract + integration tests across domains.

import type { Order, Product } from '#shared/schemas/ecommerce.js';

/**
 * Three products in one category ("茗茶"), with a clear ranking signal profile:
 * - P_A: high recent sales, low previous (breakout growth), healthy stock.
 * - P_B: steady sales, high stock (low ad density), median price.
 * - P_C: zero recent sales, out of stock (max stockout risk), high return rate.
 */
export const canonicalProducts: Product[] = [
  {
    product_id: 'P_A',
    name: '祁门红茶 A',
    category: '茗茶',
    price: 100,
    stock: 50,
    status: 'active',
    attributes: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
  {
    product_id: 'P_B',
    name: '祁门红茶 B',
    category: '茗茶',
    price: 100,
    stock: 500,
    status: 'active',
    attributes: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
  {
    product_id: 'P_C',
    name: '祁门红茶 C',
    category: '茗茶',
    price: 100,
    stock: 0,
    status: 'active',
    attributes: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
];

const NOW = '2026-06-14T00:00:00.000Z';

/** Orders arranged so the 7d recent window and 7d previous window are populated. */
export const canonicalOrders: Order[] = [
  // P_A recent: 10 orders, 20 units, gmv 2000
  ...makeOrders('P_A', 10, 2, 100, '2026-06-10T00:00:00.000Z', 'completed'),
  // P_A previous: 2 orders, 4 units, gmv 400 -> strong growth
  ...makeOrders('P_A', 2, 2, 100, '2026-06-01T00:00:00.000Z', 'completed'),
  // P_B recent: 4 orders, 4 units, gmv 400
  ...makeOrders('P_B', 4, 1, 100, '2026-06-10T00:00:00.000Z', 'completed'),
  // P_B previous: 4 orders, 4 units, gmv 400 -> flat
  ...makeOrders('P_B', 4, 1, 100, '2026-06-01T00:00:00.000Z', 'completed'),
  // P_C: one cancelled order (return risk), no recent sales, out of stock
  ...makeOrders('P_C', 2, 1, 100, '2026-06-10T00:00:00.000Z', 'cancelled'),
];

/** The canonical "now" timestamp for fixtures. */
export const canonicalNow = (): Date => new Date(NOW);

function makeOrders(
  productId: string,
  count: number,
  quantity: number,
  price: number,
  orderedAt: string,
  status: string,
): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    order_id: `order-${productId}-${orderedAt}-${i}`,
    user_id: 'partner-user',
    status,
    total_amount: quantity * price,
    items: [{ productId, quantity, price }],
    ordered_at: orderedAt,
    created_at: orderedAt,
    updated_at: orderedAt,
  }));
}
