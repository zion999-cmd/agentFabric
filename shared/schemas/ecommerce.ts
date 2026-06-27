// E-commerce entity schemas (products + orders). Boundary validation for migrated data.

import { z } from 'zod';
import { IsoDateString } from './common.js';

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const ProductSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  status: z.string().default('active'),
  attributes: z.record(z.string(), z.unknown()).default({}),
  created_at: IsoDateString,
  updated_at: IsoDateString,
});
export type Product = z.infer<typeof ProductSchema>;

export const OrderSchema = z.object({
  order_id: z.string().min(1),
  user_id: z.string().optional(),
  status: z.string(),
  total_amount: z.number().nonnegative(),
  items: z.array(OrderItemSchema).min(1),
  channel: z.string().optional(),
  ordered_at: IsoDateString,
  created_at: IsoDateString,
  updated_at: IsoDateString,
});
export type Order = z.infer<typeof OrderSchema>;
