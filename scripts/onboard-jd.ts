// JD 商智 auth onboarding — extract cookies from Chrome CDP for platform auth.
// Ported from agentCMS scripts/collectors/onboard_extract.ts.
//
// Usage:
//   npm run cli -- onboard-jd [--cdp-port 9222] [--auth-dir .collector-auth]

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PlaywrightCore {
  chromium: { connectOverCDP(wsUrl: string): Promise<{
    contexts(): Array<{
      cookies(urls: string[]): Promise<Array<{ domain: string; name: string; value: string }>>;
      newContext(): unknown;
    }>;
    close(): Promise<void>;
  }> };
}

const JD_DOMAINS = [
  'https://shop.jd.com',
  'https://passport.shop.jd.com',
  'https://www.jd.com',
  'https://passport.jd.com',
  'https://sz.jd.com',
];

const main = async () => {
  const args = process.argv.slice(2);
  const cdpPort = parseInt(
    args.find((a) => a.startsWith('--cdp-port='))?.split('=')[1]
    ?? args[args.indexOf('--cdp-port') + 1]
    ?? '9222',
    10,
  );
  const authDir = resolve(
    args.find((a) => a.startsWith('--auth-dir='))?.split('=')[1]
    ?? args[args.indexOf('--auth-dir') + 1]
    ?? '.collector-auth',
  );

  console.log('[onboard] JD 商智授权提取');
  console.log(`  CDP Port: ${cdpPort}`);
  console.log(`  Auth Dir: ${authDir}`);

  // Check CDP
  let wsUrl: string | null = null;
  try {
    const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    const data = (await res.json()) as { webSocketDebuggerUrl?: string };
    wsUrl = data.webSocketDebuggerUrl ?? null;
  } catch {
    console.error(`\n✗ Chrome CDP not available on port ${cdpPort}.`);
    console.error('  Start Chrome with: open -a "Google Chrome" --args --remote-debugging-port=9222');
    process.exit(1);
  }

  if (!wsUrl) {
    console.error('Could not get CDP WebSocket URL');
    process.exit(1);
  }

  // Load playwright-core (optional)
  let playwright: PlaywrightCore;
  try {
    playwright = await import(String('playwright-core')) as unknown as PlaywrightCore;
  } catch {
    console.error('\n✗ playwright-core not installed. Run: npm install playwright-core');
    process.exit(1);
  }

  const browser = await playwright.chromium.connectOverCDP(wsUrl);
  const context = browser.contexts()[0];
  if (!context) {
    console.error('No browser context found. Open sz.jd.com in Chrome first.');
    await browser.close();
    process.exit(1);
  }

  // Extract cookies
  console.log('\nExtracting cookies...');
  const allCookies: Record<string, string> = {};
  for (const domain of JD_DOMAINS) {
    try {
      const cookies = await context.cookies([domain]);
      for (const c of cookies) {
        const key = `${c.domain}:${c.name}`;
        allCookies[key] = c.value;
      }
      console.log(`  ${domain}: ${cookies.length} cookies`);
    } catch {
      console.log(`  ${domain}: (no cookies)`);
    }
  }

  if (Object.keys(allCookies).length === 0) {
    console.error('\n✗ No JD cookies found. Open sz.jd.com in Chrome and log in first.');
    await browser.close();
    process.exit(1);
  }

  // Build cookie header
  const cookiePairs: string[] = [];
  for (const [key, value] of Object.entries(allCookies)) {
    const name = key.split(':').pop() ?? key;
    cookiePairs.push(`${name}=${value}`);
  }

  const profile = {
    platform: 'jd',
    extracted_at: new Date().toISOString(),
    cookies: allCookies,
    cookieHeader: cookiePairs.join('; '),
  };

  mkdirSync(authDir, { recursive: true });
  const filePath = resolve(authDir, 'jd.json');
  writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');

  console.log(`\n✓ Saved: ${filePath}`);
  console.log(`  ${Object.keys(allCookies).length} cookies extracted`);
  console.log(`  Cookie header length: ${profile.cookieHeader.length} chars`);
  console.log('\nNext: npm run cli -- collect jd jd_shop_001 --mode live --days 30');

  await browser.close();
};

main().catch((e) => {
  console.error('onboard failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
