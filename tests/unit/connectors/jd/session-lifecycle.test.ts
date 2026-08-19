// Consolidation Pass 1.1 — JD session lifecycle tests.
// Verifies the idempotent no-op paths and the state classification.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('#app/connectors/jd/acquisition/cdp-client.js', () => ({
  isCdpAvailable: vi.fn(),
  isJdPageAvailable: vi.fn(),
}));

import { isCdpAvailable, isJdPageAvailable } from '#app/connectors/jd/acquisition/cdp-client.js';
import {
  ensureChromeReady,
  ensureJdPageOpen,
  ensureJdSession,
} from '#app/connectors/jd/acquisition/session-lifecycle.js';

const isCdpAvailableMock = vi.mocked(isCdpAvailable);
const isJdPageAvailableMock = vi.mocked(isJdPageAvailable);

beforeEach(() => {
  isCdpAvailableMock.mockResolvedValue(true);
  isJdPageAvailableMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureChromeReady', () => {
  it('is a no-op when Chrome is already reachable', async () => {
    expect(await ensureChromeReady()).toBe(true);
    expect(isCdpAvailableMock).toHaveBeenCalledWith(9222);
  });
});

describe('ensureJdPageOpen', () => {
  it('is a no-op when a sz.jd.com page is already open', async () => {
    expect(await ensureJdPageOpen()).toBe(true);
  });

  it('opens the 商智 home page via CDP /json/new when no JD page is present', async () => {
    isJdPageAvailableMock.mockReset();
    isJdPageAvailableMock.mockResolvedValueOnce(false).mockResolvedValue(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    expect(await ensureJdPageOpen()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://127.0.0.1:9222/json/new?${encodeURIComponent('https://jdsz.jd.com/szweb/view/index/home.html')}`,
      { method: 'PUT' },
    );
  });
});

describe('ensureJdSession', () => {
  it('reports ready when chrome + page are both ready', async () => {
    const state = await ensureJdSession();
    expect(state).toEqual({ chrome: 'ready', jdPage: 'available', ready: true });
  });
});
