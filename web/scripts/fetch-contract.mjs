import fs from 'node:fs/promises';
const base = process.env.BACKEND_BASE_URL ?? 'http://94.184.32.84:8090';
const r = await fetch(new URL('/openapi/v1.json', base), { signal: AbortSignal.timeout(30000) });
if (!r.ok) throw new Error(`OpenAPI HTTP ${r.status}`);
const schema = await r.json();
if (!schema.paths || !schema.components?.schemas) throw new Error('Invalid OpenAPI document');
schema['x-makan-snapshot'] = {
  date: new Date().toISOString().slice(0, 10),
  origin: new URL(base).origin,
};
await fs.writeFile('contracts/openapi.json', JSON.stringify(schema, null, 2));
console.log('Snapshot updated. Review diff and run npm run api:generate.');
