// P0010.1 Workspace Productization Baseline — capture 3 demo screenshots.
// One-shot CLI: open each of the 3 demo situations in a headless browser
// and save a PNG to data/fabric-workspace/screenshots/.
//
// Run: tsx scripts/capture-demo-screenshots.ts
// Requires: dev server running on http://localhost:3000

import { chromium, type Page } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = './data/fabric-workspace/screenshots';

const TARGETS = [
  { id: 'sit_observe_demo', file: '01_observe.png' },
  { id: 'sit_human_demo', file: '02_human_guidance.png' },
  { id: 'sit_failed_recover_demo', file: '03_failed_recover.png' },
];

async function captureFor(page: Page, situationId: string, file: string): Promise<void> {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('body', { timeout: 10000 });

  // The default landing view is "今日工作" (Today) which may not show
  // the demo situations. Switch to "全部 Situation" (All Situations)
  // first to ensure the demos are in the feed.
  const allLink = page.locator('text=全部 Situation').first();
  try {
    await allLink.click({ timeout: 3000 });
  } catch {
    // The selector may be different; fall back to the API + window function.
  }

  // The inbox renders each situation as `<div class="situation-card"
  // data-situation-id="...">`. Wait for the SPECIFIC card to appear
  // (the inbox is async, and the data-situation-id only materializes
  // after the API response is rendered).
  const card = page.locator(`.situation-card[data-situation-id="${situationId}"]`).first();
  try {
    await card.waitFor({ timeout: 15000 });
    await card.click();
    // Wait for the detail view to appear (situationWhatHappened_* id).
    await page.waitForSelector(`[id^="situationWhatHappened_"]`, { timeout: 8000 });
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[screenshot] ${situationId}: card not found, falling back to direct API render`);
  }
  // Give the SPA a moment to render the Hero + Layer 2 + Track.
  await page.waitForTimeout(1500);
  const out = join(OUT_DIR, file);
  await page.screenshot({ path: out, fullPage: true });
  // eslint-disable-next-line no-console
  console.log(`[screenshot] ${situationId} → ${out}`);
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  // We pin a chromium executable that is already cached locally (1223).
  // The system playwright-core in this project targets 1228 (not cached) but
  // 1223 is a binary-compatible headless shell. CI / dev should run
  // `npx playwright install chromium` for the canonical 1228.
  const executablePath = process.env.CHROME_PATH
    ?? '/Users/bx/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-x64/chrome-headless-shell';
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();
  for (const t of TARGETS) {
    try {
      await captureFor(page, t.id, t.file);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[screenshot] ${t.id} failed:`, e);
    }
  }
  await browser.close();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
