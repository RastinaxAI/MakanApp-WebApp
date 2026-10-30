import { readFile, mkdir } from 'node:fs/promises';
import { test, expect } from './test';

test('standalone V2 reference renders all 130 screens at three sizes with valid route targets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(await readFile('output/design/makan-responsive-prototype.html', 'utf8'));
  const results = await page.evaluate(() => {
    const preview = (
      window as unknown as {
        MakanPreview: {
          specs: { id: string }[];
          go: (id: string) => void;
          setDevice: (device: string) => void;
        };
      }
    ).MakanPreview;
    const ids = new Set(preview.specs.map((s) => s.id)),
      problems: string[] = [];
    for (const device of ['mobile', 'tablet', 'desktop']) {
      preview.setDevice(device);
      for (const spec of preview.specs) {
        preview.go(spec.id);
        const frame = document.querySelector('[data-screen-id]');
        if (frame?.getAttribute('data-screen-id') !== spec.id || !frame.textContent?.trim())
          problems.push(device + ':' + spec.id + ':blank');
        for (const el of document.querySelectorAll('[data-go]')) {
          const target = el.getAttribute('data-go');
          if (target && !ids.has(target)) problems.push(spec.id + ':unknown:' + target);
        }
      }
    }
    return { count: ids.size, problems };
  });
  expect(results).toEqual({ count: 130, problems: [] });
  expect(errors).toEqual([]);
  await mkdir('test-results/screenshots', { recursive: true });
  for (const [device, width, height] of [
    ['mobile', 390, 844],
    ['tablet', 834, 1194],
    ['desktop', 1440, 1000],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate((device) => {
      const p = (
        window as unknown as {
          MakanPreview: { go: (id: string) => void; setDevice: (device: string) => void };
        }
      ).MakanPreview;
      p.setDevice(device);
      p.go('S01');
    }, device);
    await page.screenshot({ path: `test-results/screenshots/reference-${width}.png` });
  }
});
