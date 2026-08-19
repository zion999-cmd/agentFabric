// Product Catalog producer — projects JD getProductList (identity) into the
// canonical products table.
//
// Catalog = "who it is", NOT "how it is doing". Operating metrics (sku_qtty /
// brow_cnt / deal_rate / deal_ord_amt / buyer_cnt) stay in Evidence/Signal/Ranking
// — they are NOT copied into the catalog as static attributes.

import type { Product } from '#shared/schemas/ecommerce.js';
import { nowIso } from '#shared/utils/time.js';

interface JdProductListEntry {
  spu_id?: string;
  hb_spu_id?: string;
  proName?: string;
  proPic?: string;
  proUrl?: string;
  [key: string]: unknown;
}

/** Parse the JD getProductList evidence envelope into raw product entries. */
const parseProductListEntries = (data: unknown): JdProductListEntry[] => {
  const arr = Array.isArray(data) ? data : [data];
  const entries: JdProductListEntry[] = [];
  for (const item of arr) {
    const body = (item as { body?: unknown })?.body ?? item;
    const bodyData = (body as { data?: unknown })?.data ?? body;
    const list = (bodyData as { list?: unknown })?.list ?? (Array.isArray(bodyData) ? bodyData : []);
    if (Array.isArray(list)) {
      for (const e of list) entries.push(e as JdProductListEntry);
    }
  }
  return entries;
};

/**
 * Project getProductList entries into canonical Product identity.
 * Only identity fields are projected: spu_id → product_id, proName → name,
 * proPic/proUrl → attributes. category/price/stock are null (JD does not
 * guarantee them) — never fabricated placeholders.
 */
export const projectProductCatalog = (data: unknown): Product[] => {
  const entries = parseProductListEntries(data);
  const now = nowIso();
  const seen = new Set<string>();
  const products: Product[] = [];

  for (const e of entries) {
    const id = e.spu_id ?? e.hb_spu_id;
    if (!id) continue;
    const name = e.proName ?? '';
    if (!name) continue;
    if (seen.has(String(id))) continue;
    seen.add(String(id));

    products.push({
      product_id: String(id),
      name: String(name),
      category: null,
      price: null,
      stock: null,
      status: 'active',
      attributes: {
        proPic: e.proPic ?? null,
        proUrl: e.proUrl ?? null,
      },
      created_at: now,
      updated_at: now,
    });
  }

  return products;
};
