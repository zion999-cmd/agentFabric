// Signal domain local types. Inputs to the pure calculators + pipeline.

import type { Order, Product } from '#shared/schemas/ecommerce.js';

/** Per-product aggregated metrics over recent + previous windows. */
export interface ProductRawMetrics {
  productId: string;
  unitsRecent: number;
  unitsPrevious: number;
  gmvRecent: number;
  gmvPrevious: number;
  orderCountRecent: number;
  orderCountPrevious: number;
  cancelledOrders: number;
  totalProductOrders: number;
  stock: number;
  price: number;
  category: string;
  categoryMedianPrice: number;
}

/** The full input to the signal pipeline. */
export interface SignalPipelineInput {
  products: readonly Product[];
  orders: readonly Order[];
}

/** Options for the signal pipeline. */
export interface SignalPipelineOptions {
  now?: Date;
  windowDays?: readonly number[]; // default [3, 7, 14]
  previousWindowDays?: number; // default = same as windowDays[i]
  sourcePlatform?: string;
  sourceDataset?: string;
  lifecycleTtlHours?: number; // default 24
}

/** Resolves a signal weight by name (base or full). */
export type SignalWeightResolver = (signalName: string) => number | undefined;
