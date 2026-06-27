// Risk calculators. Pure functions ported verbatim from agentCMS.

import { clamp, safeDivide } from '#shared/utils/math.js';

/**
 * Stockout risk score (0-1). Based on days of stock coverage.
 * - stock <= 0 -> 1 (already out of stock)
 * - coverageDays = stock / (unitsRecent / 7)  (daily burn rate from weekly units)
 * - <= 7 days -> 0.9, <= 14 days -> 0.6, else 0.25
 */
export const stockoutRiskScore = (stock: number, unitsRecent: number): number => {
  if (stock <= 0) return 1;
  const dailyBurn = unitsRecent / 7;
  if (dailyBurn <= 0) return 0.25;
  const coverageDays = safeDivide(stock, dailyBurn, stock);
  if (coverageDays <= 7) return 0.9;
  if (coverageDays <= 14) return 0.6;
  return 0.25;
};

/**
 * Return risk score (0-1) = cancelled orders / total product orders, clamped.
 */
export const returnRiskScore = (cancelledOrders: number, totalProductOrders: number): number => {
  if (totalProductOrders <= 0) return 0;
  return clamp(safeDivide(cancelledOrders, totalProductOrders, 0));
};
