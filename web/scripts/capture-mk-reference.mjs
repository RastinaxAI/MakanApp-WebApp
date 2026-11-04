import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const origin = process.env.MK_REVIEW_ORIGIN ?? 'http://127.0.0.1:3144';
const directory = process.env.MK_REVIEW_OUTPUT ?? 'output/review/mk-v3/native';
const { directory: referenceDirectory } = JSON.parse(
  await fs.readFile('design/reference.json', 'utf8'),
);
let specs = JSON.parse(await fs.readFile(referenceDirectory + '/screens.json', 'utf8')).screens;
const selected = process.env.MK_CAPTURE_IDS ? new Set(process.env.MK_CAPTURE_IDS.split(',')) : null;
if (selected) specs = specs.filter((s) => selected.has(s.id));
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const spec of specs) {
    const context = await browser.newContext({
      viewport: { width: spec.width, height: spec.height },
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const response = await page.goto(origin + '/preview/reference/' + spec.id, {
      waitUntil: 'networkidle',
    });
    await page.locator('[data-mk-view="' + spec.id + '"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      fontReady: document.fonts.check('16px "Makan Reference"'),
      unlabelled: [...document.querySelectorAll('button,input,textarea,select')].filter(
        (e) =>
          !e.getAttribute('aria-label') &&
          !e.textContent.trim() &&
          !e.closest('label') &&
          !e.labels?.length,
      ).length,
    }));
    await page.screenshot({ path: path.join(directory, spec.id + '.png'), animations: 'disabled' });
    results.push({
      id: spec.id,
      status: response.status(),
      ...layout,
      errors,
      image: path.join(directory, spec.id + '.png'),
    });
    await context.close();
  }
  if (selected) {
    const previous = JSON.parse(await fs.readFile(path.join(directory, 'capture.json'), 'utf8'));
    for (const row of previous.screens)
      if (!results.some((r) => r.id === row.id)) results.push(row);
    results.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
  }
  await fs.writeFile(
    path.join(directory, 'capture.json'),
    JSON.stringify({ origin, synthetic: true, screens: results }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      screens: results.length,
      errors: results.filter((x) => x.errors.length),
      overflow: results.filter((x) => x.overflow),
      unlabelled: results.filter((x) => x.unlabelled),
    }),
  );
} finally {
  await browser.close();
}
