// One-shot migration: agentCMS data/*.json -> agentFabric SQLite.
// Validates at the boundary with Zod; maps agentCMS field names to our schema.
// Idempotent (upsert by primary key).
//
// Usage: npm run migrate:agentcms [-- /path/to/agentCMS]

import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { upsertOrders, upsertProducts } from '#platform/storage/product-repository.js';
import type { Order, Product } from '#shared/schemas/ecommerce.js';

const AGENTCMS_ROOT = process.argv[2] ?? '/Users/bx/Workspace/agentCMS';

// agentCMS raw shapes (camelCase field names).
const AgentCmsProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  stock: z.number().int(),
  status: z.string().default('active'),
  attributes: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AgentCmsOrderSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().nonnegative(),
      }),
    )
    .min(1),
  status: z.string(),
  totalAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const mapProduct = (raw: z.infer<typeof AgentCmsProductSchema>): Product => ({
  product_id: raw.id,
  name: raw.name,
  category: raw.category,
  price: raw.price,
  stock: raw.stock,
  status: raw.status,
  attributes: raw.attributes,
  created_at: raw.createdAt,
  updated_at: raw.updatedAt,
});

const mapOrder = (raw: z.infer<typeof AgentCmsOrderSchema>): Order => ({
  order_id: raw.id,
  ...(raw.userId ? { user_id: raw.userId } : {}),
  status: raw.status,
  total_amount: raw.totalAmount,
  items: raw.items,
  ordered_at: raw.createdAt,
  created_at: raw.createdAt,
  updated_at: raw.updatedAt,
});

const readJson = async (path: string): Promise<unknown> => {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text) as unknown;
};

const main = async (): Promise<void> => {
  const dbPath = process.env.DB_PATH ?? './data/agentfabric.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  initDatabase(db);

  const productsRaw = (await readJson(`${AGENTCMS_ROOT}/data/products.json`)) as unknown[];
  const ordersRaw = (await readJson(`${AGENTCMS_ROOT}/data/orders.json`)) as unknown[];

  const products: Product[] = [];
  let productErrors = 0;
  for (const raw of productsRaw) {
    const parsed = AgentCmsProductSchema.safeParse(raw);
    if (parsed.success) products.push(mapProduct(parsed.data));
    else productErrors += 1;
  }

  const orders: Order[] = [];
  let orderErrors = 0;
  for (const raw of ordersRaw) {
    const parsed = AgentCmsOrderSchema.safeParse(raw);
    if (parsed.success) orders.push(mapOrder(parsed.data));
    else orderErrors += 1;
  }

  const productCount = upsertProducts(db, products);
  const orderCount = upsertOrders(db, orders);

  // eslint-disable-next-line no-console
  console.log(
    `[agentFabric] migrated ${productCount} products (${productErrors} skipped), ${orderCount} orders (${orderErrors} skipped) from ${AGENTCMS_ROOT}`,
  );
  db.close();
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[agentFabric] migration failed:', error);
  process.exit(1);
});
