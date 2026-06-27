// CLI entry point. Subcommands: rank, signals, review, collect, db:init.
// Uses node:util parseArgs. Calls domain façades — never business internals.

import { parseArgs } from 'node:util';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { listOrders, listProducts } from '#platform/storage/product-repository.js';
import { rankProductsComposition } from '#app/orchestrator.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import type { RankingProfileName } from '#shared/schemas/ranking.js';

const HELP = `agentFabric CLI
Usage:
  cli db:init                       Initialize the SQLite database
  cli rank [--profile <name>]       Rank all products and print the top result
  cli signals <entityId>            List signals for a product
  cli collect <source> <shopId>     (stub) collect platform signals
Profiles: sales_leaderboard | growth_discovery | operator_mode (default)
`;

const isProfile = (v: string): v is RankingProfileName =>
  v === 'sales_leaderboard' || v === 'growth_discovery' || v === 'operator_mode';

const cmdRank = async (args: string[]): Promise<void> => {
  const { values } = parseArgs({
    args,
    options: {
      profile: { type: 'string', default: 'operator_mode' },
    },
  });
  const profile = values.profile ?? 'operator_mode';
  if (!isProfile(profile)) {
    console.error(`Unknown profile: ${profile}`);
    process.exit(1);
  }
  const db = openDb();
  const products = listProducts(db);
  const orders = listOrders(db);
  if (products.length === 0) {
    console.error('No products. Run: npm run migrate:agentcms');
    process.exit(1);
  }
  const result = await rankProductsComposition({ products, orders, profile, db });
  const top = result.rankings[0]!;
  console.log(`\n=== ${profile} 排名榜首 ===`);
  console.log(`商品: ${top.entity_id}`);
  console.log(`综合得分: ${top.overall_score.toFixed(3)}`);
  console.log(`置信度: ${top.confidence.toFixed(2)} | 覆盖度: ${top.coverage.toFixed(2)}`);
  console.log(`优势: ${top.explainability.strengths.join('、') || '无'}`);
  console.log(`风险: ${top.explainability.risks.join('、') || '无'}`);
  console.log(`信任分: ${result.topTrace.alignment.trust_score.toFixed(2)}`);
  console.log(`\nAI 摘要:\n${result.aiSummary}`);
  db.close();
};

const cmdSignals = (args: string[]): void => {
  const entityId = args[0];
  if (!entityId) {
    console.error('Usage: cli signals <entityId>');
    process.exit(1);
  }
  const db = openDb();
  const signals = SignalFacade.list(db, 'product', entityId);
  console.log(`\n=== Signals for ${entityId} (${signals.length}) ===`);
  for (const s of signals) {
    console.log(
      `${s.signal_name.padEnd(28)} ${s.signal_value.toFixed(3).padStart(7)}  ${s.signal_direction.padEnd(5)}  conf=${s.confidence.toFixed(2)}`,
    );
  }
  db.close();
};

const cmdCollect = (args: string[]): void => {
  const [source, shopId] = args;
  if (!source || !shopId) {
    console.error('Usage: cli collect <source> <shopId>');
    process.exit(1);
  }
  console.log(`[agentFabric] collect stub: source=${source} shop=${shopId} (CDP onboarding is a follow-up)`);
};

const cmdDbInit = (): void => {
  const db = openDb();
  initDatabase(db);
  console.log(`[agentFabric] database initialized at ${process.env.DB_PATH ?? './data/agentfabric.db'}`);
  db.close();
};

const main = async (): Promise<void> => {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'db:init':
      cmdDbInit();
      break;
    case 'rank':
      await cmdRank(rest);
      break;
    case 'signals':
      cmdSignals(rest);
      break;
    case 'collect':
      cmdCollect(rest);
      break;
    case undefined:
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n\n${HELP}`);
      process.exit(1);
  }
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
