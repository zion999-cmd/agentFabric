// Aggregation: flatten orders + line items into per-product windowed raw metrics.
// Pure function over the validated Product[] + Order[] inputs.

import type { Order, Product } from '#shared/schemas/ecommerce.js';
import { median } from '#shared/utils/math.js';
import { isWithin, windowBounds } from '#shared/utils/time.js';
import type { ProductRawMetrics } from './types.js';

const CANCELLED_STATUS = 'cancelled';

/**
 * Aggregate per-product raw metrics over recent + previous windows.
 *
 * - recent window: [now - windowDays, now]
 * - previous window: [now - windowDays - previousWindowDays, now - windowDays)
 * - units/gmv/orderCount: non-cancelled orders in each window
 * - cancelledOrders / totalProductOrders: all orders for the product (any time)
 */
export const aggregateProductMetrics = (
  products: readonly Product[],
  orders: readonly Order[],
  now: Date,
  windowDays: number,
  previousWindowDays: number,
): Map<string, ProductRawMetrics> => {
  const { recentStart, previousStart } = windowBounds(now, windowDays, previousWindowDays);

  const metrics = new Map<string, ProductRawMetrics>();

  for (const product of products) {
    metrics.set(product.product_id, {
      productId: product.product_id,
      unitsRecent: 0,
      unitsPrevious: 0,
      gmvRecent: 0,
      gmvPrevious: 0,
      orderCountRecent: 0,
      orderCountPrevious: 0,
      cancelledOrders: 0,
      totalProductOrders: 0,
      stock: product.stock,
      price: product.price,
      category: product.category,
      categoryMedianPrice: product.price,
    });
  }

  for (const order of orders) {
    for (const item of order.items) {
      const m = metrics.get(item.productId);
      if (!m) continue;
      m.totalProductOrders += 1;
      if (order.status === CANCELLED_STATUS) {
        m.cancelledOrders += 1;
        continue;
      }
      const itemGmv = item.quantity * item.price;
      if (isWithin(order.ordered_at, recentStart, now)) {
        m.unitsRecent += item.quantity;
        m.gmvRecent += itemGmv;
        m.orderCountRecent += 1;
      } else if (isWithin(order.ordered_at, previousStart, recentStart)) {
        m.unitsPrevious += item.quantity;
        m.gmvPrevious += itemGmv;
        m.orderCountPrevious += 1;
      }
    }
  }

  // Attach category median price per product.
  const categoryMedians = computeCategoryMedians(products);
  for (const m of metrics.values()) {
    m.categoryMedianPrice = categoryMedians.get(m.category) ?? m.price;
  }

  return metrics;
};

/** Median price per category. */
const computeCategoryMedians = (
  products: readonly Product[],
): Map<string, number> => {
  const byCategory = new Map<string, number[]>();
  for (const p of products) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p.price);
    byCategory.set(p.category, list);
  }
  const medians = new Map<string, number>();
  for (const [category, prices] of byCategory) {
    medians.set(category, median(prices));
  }
  return medians;
};
