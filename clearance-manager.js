const { chromium } = require('playwright');

const cache = new Map();
const inflight = new Map();

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

  await page.goto('https://arras.io', { waitUntil: 'domcontentloaded', timeout: 10000 });

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
  if (!found) {
    await browser.close();
    throw new Error('Cloudflare clearance not found');
  }

  const expiry = Number(found.expires || Math.floor(Date.now() / 1000) + 3600);
  const result = {
    value: found.value,
    userAgent: finalUserAgent,
    expiry,
    proxy: proxyUrl || 'direct',
    earnedAt: Date.now()
  };

  await browser.close();

  return result;
}

async function getClearance(proxyUrl) {
  const key = proxyCookieKey(proxyUrl);
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now() / 1000 + 90) {
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

module.exports = { getClearance, invalidate };
