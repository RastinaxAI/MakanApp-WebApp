import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { entries } from './design-atlas-manifest.mjs';
process.chdir(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
const report = JSON.parse(await fs.readFile('tmp/design-atlas/captures.json', 'utf8')),
  map = new Map(report.views.map((view) => [view.id, view]));
const errors = [],
  images = [];
for (const entry of entries) {
  const view = map.get(entry.id);
  if (view?.result !== 'captured') {
    errors.push({ id: entry.id, error: view?.error ?? 'missing capture' });
    continue;
  }
  for (const [viewport, shots] of Object.entries(view.shots)) {
    if (!shots.length) errors.push({ id: entry.id, error: 'empty viewport' });
    for (const shot of shots) {
      if (!shot.file.startsWith('output/review/design-atlas/') || shot.file.includes('..'))
        throw Error('Unexpected image path');
      const data = await fs.readFile(shot.file);
      if (data.readUInt32BE(16) !== shot.width || data.readUInt32BE(20) !== shot.height)
        errors.push({ id: entry.id, error: 'image dimensions mismatch' });
      images.push({
        id: entry.id,
        viewport,
        ...shot,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    }
  }
}
if (errors.length) throw Error(JSON.stringify(errors));
const hash = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const sourceFiles = (await fs.readdir('src', { recursive: true }))
  .filter((file) => /\.(tsx?|css|json)$/.test(file))
  .sort();
const sourceHashes = Object.fromEntries(
  await Promise.all(sourceFiles.map(async (file) => ['src/' + file, await hash('src/' + file)])),
);
const result = {
  createdAtUtc: new Date().toISOString(),
  application: 'web/ Next.js 16.4.2',
  buildId: (await fs.readFile('.next/BUILD_ID', 'utf8')).trim(),
  views: entries.length,
  capturedViews: entries.length,
  images: images.length,
  viewports: {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 1000 },
    tablet: { width: 834, height: 1194 },
  },
  bySection: Object.fromEntries(
    [...new Set(entries.map((entry) => entry.section))].map((section) => [
      section,
      entries.filter((entry) => entry.section === section).length,
    ]),
  ),
  sourceFingerprint: createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex'),
  sourceHashes,
  syntheticData: true,
  externalDomainWrites: false,
  localContractAdapters: report.views
    .filter((view) => view.dataAdapter)
    .map((view) => ({ id: view.id, key: view.key, adapter: view.dataAdapter })),
  aliases: [
    { route: '/personal/invitations', coveredBy: '/personal/education/invitations' },
    { route: '/personal/privacy', coveredBy: '/personal/settings/privacy' },
    { route: '/personal/ai', coveredBy: '/personal/assistant' },
  ],
  imagesManifest: images,
  limitations: [
    'Capture validates rendered UI, not public backend execution.',
    'AI demo and runtime-unavailable views have explicit labels.',
    'Platform-owner and retired root app are outside this active client.',
  ],
  errors,
};
await fs.writeFile(
  'docs/quality/IMPLEMENTED_DESIGN_ATLAS.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    views: result.views,
    images: result.images,
    errors: errors.length,
    sourceFingerprint: result.sourceFingerprint,
  }),
);
