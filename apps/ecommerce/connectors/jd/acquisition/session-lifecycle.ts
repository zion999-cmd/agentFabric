// JD session lifecycle — the minimal ownership of the Chrome / 商智-page readiness
// that the CDP acquisition depends on (Consolidation Pass 1.1 leftover).
//
// Boundary (established in Pass 1.2): JD canonical execution is CDP/browser-mediated.
// Fabric therefore owns the *readiness* of that browser session:
//   - launch Chrome with remote debugging if it isn't running
//   - open the 商智 home page if no sz.jd.com tab is present
//
// Fabric does NOT own: login (the operator does it), auth bypass, or a general
// Browser Manager. The login itself remains the one legitimate human boundary.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { isCdpAvailable, isJdPageAvailable } from './cdp-client.js';

const JD_HOME_URL = 'https://jdsz.jd.com/szweb/view/index/home.html';

/** Candidate Chrome binaries (env override first, then per-platform defaults). */
const CHROME_CANDIDATES: readonly string[] = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].filter((p): p is string => Boolean(p));

/** Persistent profile dir so an operator's login survives across restarts. */
const PROFILE_DIR = resolve(process.env.HOME ?? process.cwd(), '.agentfabric', 'chrome-jd-profile');

export interface JdSessionState {
  chrome: 'ready' | 'launched' | 'missing';
  jdPage: 'available' | 'opened' | 'missing';
  ready: boolean;
}

/** Launch Chrome with remote debugging if it isn't already reachable. */
export const ensureChromeReady = async (port = 9222): Promise<boolean> => {
  if (await isCdpAvailable(port)) return true;

  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chromePath) return false;

  mkdirSync(PROFILE_DIR, { recursive: true });
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();

  // Wait up to 30s for Chrome to become reachable.
  for (let i = 0; i < 60; i++) {
    if (await isCdpAvailable(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

/** Open a new tab in Chrome via its CDP HTTP endpoint. */
const openChromeTab = async (port: number, url: string): Promise<void> => {
  // Chrome ≥111: PUT /json/new?<url-encoded> (the URL is the whole query string).
  await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
};

/** Open the 商智 home page if no sz.jd.com page is present. */
export const ensureJdPageOpen = async (port = 9222): Promise<boolean> => {
  if (await isJdPageAvailable(port)) return true;
  try {
    await openChromeTab(port, JD_HOME_URL);
    for (let i = 0; i < 20; i++) {
      if (await isJdPageAvailable(port)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch {
    // opening failed — leave jdPage as missing
  }
  return false;
};

/** Ensure the JD session is ready: Chrome running + 商智 page open. */
export const ensureJdSession = async (port = 9222): Promise<JdSessionState> => {
  const wasReady = await isCdpAvailable(port);
  const chromeReady = await ensureChromeReady(port);
  if (!chromeReady) return { chrome: 'missing', jdPage: 'missing', ready: false };

  const pageReady = await ensureJdPageOpen(port);
  return {
    chrome: wasReady ? 'ready' : 'launched',
    jdPage: pageReady ? 'available' : 'missing',
    ready: pageReady,
  };
};
