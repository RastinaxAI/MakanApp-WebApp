// Extract native-screen reference data from the updated author's self-contained HTML.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const input = process.argv[2];
if (!input) throw Error('Pass the supplied design source directory');
const active = JSON.parse(await fs.readFile('design/reference.json', 'utf8'));
const output = active.directory;
await fs.mkdir(output + '/app-screens', { recursive: true });
for (const [from, to] of [
  ['MakanApp_UI_Design.html', 'MakanApp_Visual_Reference.html'],
  ['ui.css', 'ui.css'],
  ['education.css', 'education.css'],
  ['blue-theme.css', 'blue-theme.css'],
  ['theme_provenance.json', 'theme-provenance.json'],
  ['page_manifest.json', 'pages.json'],
]) {
  await fs.copyFile(path.join(input, from), output + '/' + to);
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const original = await browser.newPage();
  await original.goto(pathToFileURL(path.resolve(input, 'MakanApp_UI_Design.html')).href);
  await original.evaluate(() => document.fonts.ready);
  const data = await original.evaluate(() => {
    const entries = [];
    for (const fig of document.querySelectorAll('figure[data-screen]')) {
      const id = fig.dataset.screen;
      if (!/^MK-\d+$/.test(id) || entries.some((x) => x.id === id)) continue;
      const caption = fig.querySelector('figcaption');
      entries.push({
        id,
        page: Number(fig.closest('.sheet').id.split('-')[1]),
        title: caption.querySelector('h3').textContent,
        note: caption.querySelector('p').textContent,
        kind: 'mobile',
        width: 390,
        height: 844,
        html: fig.querySelector('.screen').outerHTML,
      });
    }
    for (const [key, id, title] of [
      ['desktopReview', 'MK-19', 'صف و جزئیات بررسی تشکیل کلاس'],
      ['desktopManager', 'MK-56', 'مدیریت اعضای کلاس در دسکتاپ'],
      ['desktopEducation', 'MK-81', 'میز کار تکلیف در کلاس مستقل'],
      ['desktopExamEditor', 'MK-82', 'ویرایشگر آزمون مستقل در دسکتاپ'],
    ]) {
      const wrapper = document.querySelector(`[data-screen="${key}"]`);
      entries.push({
        id,
        page: Number(wrapper.closest('.sheet').id.split('-')[1]),
        title,
        note: wrapper.querySelector('.desk-caption').textContent,
        kind: 'desktop',
        width: 1270,
        height: 764,
        html: wrapper.querySelector('.desktop').outerHTML,
      });
    }
    return { head: document.head.innerHTML, entries };
  });
  data.entries.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
  if (data.entries.length !== 82) throw Error('Expected 82 reference views');
  const capture = await browser.newPage();
  const css =
    'html,body{margin:0!important;padding:0!important;min-width:0!important;background:#f5f8fe!important}body{direction:rtl}#capture{position:relative;overflow:hidden}#capture>.screen{height:100%;width:100%;border-radius:0!important}#capture>.desktop{position:relative!important;inset:auto!important;width:100%!important;height:100%!important;transform:none!important;box-shadow:none!important;border:0!important;border-radius:0!important}#capture .status,#capture .home-safe,#capture .browserbar{display:none!important}#capture .desktop-app{height:100%!important}*{animation:none!important;transition:none!important}';
  for (const entry of data.entries) {
    await capture.setViewportSize({ width: entry.width, height: entry.height });
    await capture.setContent(
      `<!doctype html><html lang="fa" dir="rtl"><head>${data.head}<style>${css}</style></head><body><div id="capture" style="width:${entry.width}px;height:${entry.height}px">${entry.html}</div></body></html>`,
    );
    await capture.evaluate(() => document.fonts.ready);
    await capture
      .locator('#capture')
      .screenshot({ path: output + '/app-screens/' + entry.id + '.png', animations: 'disabled' });
    delete entry.html;
    entry.image = 'app-screens/' + entry.id + '.png';
    entry.product_status =
      ['MK-44', 'MK-45', 'MK-46'].includes(entry.id) || Number(entry.id.slice(3)) >= 60
        ? 'confirmed-independent-education-backend-contract-pending'
        : 'redesign_reference';
  }
  await fs.writeFile(
    output + '/screens.json',
    JSON.stringify(
      {
        reference: `MakanApp visual design ${active.version}, 2026-11-03`,
        screen_count: 82,
        sourcePdfSha256: active.sourcePdfSha256,
        note: 'Static design references; no API or implementation evidence.',
        screens: data.entries,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Imported and captured 82 ${active.version} reference views.`);
} finally {
  await browser.close();
}
