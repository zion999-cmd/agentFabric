// Product + order persistence: read/write e-commerce entities to SQLite.

import type { Database as Db } from 'better-sqlite3';
import type { Order, Product } from '#shared/schemas/ecommerce.js';

/** Upsert products. Returns count stored. */
export const upsertProducts = (db: Db, products: readonly Product[]): number => {
  const stmt = db.prepare(
    `INSERT INTO products (product_id, name, category, price, stock, status, attributes, created_at, updated_at)
     VALUES (@product_id, @name, @category, @price, @stock, @status, @attributes, @created_at, @updated_at)
     ON CONFLICT(product_id) DO UPDATE SET
       name = excluded.name, category = excluded.category, price = excluded.price,
       stock = excluded.stock, status = excluded.status, attributes = excluded.attributes,
       updated_at = excluded.updated_at`,
  );
  let count = 0;
  const tx = db.transaction((rows: readonly Product[]) => {
    for (const p of rows) {
      stmt.run({
        product_id: p.product_id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        status: p.status,
        attributes: JSON.stringify(p.attributes),
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
      count += 1;
    }
  });
  tx([...products]);
  return count;
};

/** Upsert orders. Returns count stored. */
export const upsertOrders = (db: Db, orders: readonly Order[]): number => {
  const stmt = db.prepare(
    `INSERT INTO orders (order_id, user_id, status, total_amount, items, channel, ordered_at, created_at, updated_at)
     VALUES (@order_id, @user_id, @status, @total_amount, @items, @channel, @ordered_at, @created_at, @updated_at)
     ON CONFLICT(order_id) DO UPDATE SET
       status = excluded.status, total_amount = excluded.total_amount, items = excluded.items,
       channel = excluded.channel, updated_at = excluded.updated_at`,
  );
  let count = 0;
  const tx = db.transaction((rows: readonly Order[]) => {
    for (const o of rows) {
      stmt.run({
        order_id: o.order_id,
        user_id: o.user_id ?? null,
        status: o.status,
        total_amount: o.total_amount,
        items: JSON.stringify(o.items),
        channel: o.channel ?? null,
        ordered_at: o.ordered_at,
        created_at: o.created_at,
        updated_at: o.updated_at,
      });
      count += 1;
    }
  });
  tx([...orders]);
  return count;
};

/** Load all products. */
export const listProducts = (db: Db): Product[] => {
  const rows = db.prepare('SELECT * FROM products').all() as Array<{
    product_id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    status: string;
    attributes: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    product_id: r.product_id,
    name: r.name,
    category: r.category,
    price: r.price,
    stock: r.stock,
    status: r.status,
    attributes: JSON.parse(r.attributes),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
};

/** Load all orders (items parsed from JSON). */
export const listOrders = (db: Db): Order[] => {
  const rows = db.prepare('SELECT * FROM orders').all() as Array<{
    order_id: string;
    user_id: string | null;
    status: string;
    total_amount: number;
    items: string;
    channel: string | null;
    ordered_at: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    order_id: r.order_id,
    ...(r.user_id ? { user_id: r.user_id } : {}),
    status: r.status,
    total_amount: r.total_amount,
    items: JSON.parse(r.items),
    ...(r.channel ? { channel: r.channel } : {}),
    ordered_at: r.ordered_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
};
