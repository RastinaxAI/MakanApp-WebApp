import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = process.env.MK_REVIEW_ORIGIN ?? 'http://127.0.0.1:3144';
const { directory: referenceDirectory } = JSON.parse(
  await fs.readFile('design/reference.json', 'utf8'),
);
let specs = JSON.parse(await fs.readFile(referenceDirectory + '/screens.json', 'utf8')).screens;
if (process.env.MK_REVIEW_ONLY) {
  const selected = new Set(process.env.MK_REVIEW_ONLY.split(','));
  specs = specs.filter((s) => selected.has(s.id));
}
const directory = process.env.MK_RESPONSIVE_OUTPUT ?? 'output/review/mk-v3/responsive';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  results = [];
try {
  for (const width of (process.env.MK_REVIEW_WIDTHS ?? '320,390,768,834,1024,1440,1920')
    .split(',')
    .map(Number)) {
    const context = await browser.newContext({
        viewport: { width, height: 844 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    let errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const spec of specs) {
      await page.goto(origin + '/preview/reference/' + spec.id, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-mk-view="' + spec.id + '"]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        frame: !!document.querySelector('.status,.home-safe,.browserbar,iframe'),
        inputs: [...document.querySelectorAll('input,textarea,select')].length,
      }));
      results.push({ id: spec.id, width, ...metrics, errors });
      errors = [];
      if (metrics.overflow || ['MK-04', 'MK-19', 'MK-35', 'MK-47', 'MK-56'].includes(spec.id))
        await page.screenshot({
          path: directory + '/' + spec.id + '-' + width + '.png',
          animations: 'disabled',
        });
    }
    await context.close();
    console.log('Checked ' + width + ': ' + specs.length + ' views');
  }
  const context = await browser.newContext({
      viewport: { width: 390, height: 500 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  for (const id of (
    process.env.MK_SHORT_ONLY ?? 'MK-02,MK-46,MK-60,MK-68,MK-70,MK-76,MK-81,MK-82'
  ).split(',')) {
    await page.goto(origin + '/preview/reference/' + id, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-mk-view="' + id + '"]').waitFor();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      fontSize: getComputedStyle(document.querySelector('.mk-ui')).fontSize,
      headSize: getComputedStyle(document.querySelector('.phone-head h2,.desk-head h2')).fontSize,
    }));
    await page.screenshot({ path: directory + '/' + id + '-200percent-short.png' });
    results.push({ id, width: 390, height: 500, textSize: '200%', ...metrics, errors: [] });
  }
  await context.close();
} finally {
  await browser.close();
  const failures = results.filter((r) => r.overflow || r.frame || r.errors.length);
  await fs.writeFile(
    directory + '/results.json',
    JSON.stringify({ cases: results.length, failures, checks: results }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ cases: results.length, failures }));
  if (failures.length) process.exitCode = 1;
}
