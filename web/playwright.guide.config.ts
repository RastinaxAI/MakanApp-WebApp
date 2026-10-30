import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Documentation capture only; not part of the ordinary browser test directory.
export default defineConfig({
  ...base,
  testDir: 'scripts/guide-capture',
  use: { ...base.use, deviceScaleFactor: 2 },
  timeout: 180000,
  reporter: [['list'], ['json', { outputFile: 'tmp/pdfs/panel-guide/capture-results.json' }]],
  outputDir: 'tmp/pdfs/panel-guide/browser',
});
