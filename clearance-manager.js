// language: JavaScript, file: clearance-manager.js
const { chromium } = require('playwright');

const cache = new Map();
const inflight = new Map();

const CACHE_SAFETY_SEC = 90;

function normalizeProxy(proxyUrl) {
  if (!proxyUrl || proxyUrl === 'direct' || proxyUrl === 'null') {
    return 'direct';
  }
  return String(proxyUrl);
}

function parseProxy(proxyUrl) {
  if (!proxyUrl || proxyUrl === 'direct' || proxyUrl === 'null') {
    return null;
  }

  try {
    const url = new URL(proxyUrl);
    return {
      server: `${url.protocol}//${url.host}`,
      username: url.username || '',
      password: url.password || ''
    };
  } catch {
    return null;
  }
}

function proxyCookieKey(proxyUrl) {
  return normalizeProxy(proxyUrl);
}

// [FIX] freshness check now handles -1 session cookies correctly
function isFresh(entry) {
  if (!entry) return false;
  if (entry.expiry === -1) return true;
  return entry.expiry > Math.floor(Date.now() / 1000) + CACHE_SAFETY_SEC;
}

// [FIX] synchronous peek so spawnBotNow can embed the cookie in the
// initial worker config without awaiting.
function peekClearance(proxyUrl) {
  const key = proxyCookieKey(proxyUrl);
  const entry = cache.get(key);
  if (isFresh(entry)) return entry;
  return null;
}

async function solveClearance(proxyUrl) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const launchOptions = {
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ],
    headless: false
  };

  const proxy = parseProxy(proxyUrl);

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent,
    locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
    ...(proxy ? { proxy } : {})
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      configurable: true,
      get: () => undefined
    });

    Object.defineProperty(navigator, 'plugins', {
      configurable: true,
      get: () => [
        { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mimeTypes: ['application/pdf'] },
        { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mimeTypes: ['application/pdf'] },
        { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer', mimeTypes: ['application/pdf'] }
      ]
    });

    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => ['en-US', 'en']
    });

    Object.defineProperty(window, 'chrome', {
      configurable: true,
      value: { runtime: {} }
    });
  });

  await page.goto('https://arras.io', { waitUntil: 'domcontentloaded', timeout: 15000 });

  const started = Date.now();
  const deadline = started + 90000;
  let found = null;

  while (Date.now() < deadline) {
    const cookies = await context.cookies('https://arras.io');
    const cfCookie = cookies.find((c) => c.name === 'cf_clearance');
    if (cfCookie) {
      found = cfCookie;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const finalUserAgent = await page.evaluate(() => navigator.userAgent);
  await browser.close();

  if (!found) {
    throw new Error('Cloudflare clearance not found');
  }

  // [FIX] Preserve -1 (session cookie) instead of normalizing to a fake expiry
  const rawExpiry = Number(found.expires);
  const expiry = (Number.isFinite(rawExpiry) && rawExpiry > 0)
    ? rawExpiry
    : -1;

  return {
    value: found.value,
    userAgent: finalUserAgent,
    expiry,
    proxy: proxyUrl || 'direct',
    earnedAt: Math.floor(Date.now() / 1000)
  };
}

async function getClearance(proxyUrl) {
  const key = proxyCookieKey(proxyUrl);
  const cached = cache.get(key);
  if (isFresh(cached)) {
    return cached;
  }

  if (inflight.has(key)) {
    return await inflight.get(key);
  }

  const pending = solveClearance(proxyUrl)
    .then((result) => {
      cache.set(key, result);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, pending);
  return await pending;
}

function invalidate(proxyUrl) {
  const key = proxyCookieKey(proxyUrl);
  cache.delete(key);
  inflight.delete(key);
}

module.exports = { getClearance, invalidate, peekClearance };
