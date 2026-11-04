// Public/offline UI is generated from the same editable catalog, not a second copy source.
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile('src/content/fa.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const copy = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const tokens = JSON.parse(await fs.readFile('design/tokens.json', 'utf8'));
const escape = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
await fs.writeFile(
  'public/ui-copy.js',
  '/* Generated from src/content/fa.ts. */\nself.MAKAN_PUBLIC_COPY=Object.freeze(' +
    JSON.stringify({
      notificationTitle: copy.notification_title,
      notificationBody: copy.notification_description,
    }) +
    ');\n',
);
await fs.writeFile(
  'public/offline.html',
  `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(copy.offline_pageTitle)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${tokens.light.bg};color:${tokens.light.text};font:16px/2 Tahoma,sans-serif}main{max-width:440px;text-align:center;padding:32px 24px}img{width:80px;height:80px;border-radius:22px}h1{font-size:24px}p{color:${tokens.light.muted}}a{display:block;background:${tokens.light['primary-button']};color:${tokens.light['on-primary']};padding:12px;border-radius:12px;text-decoration:none;margin-top:24px}@media(prefers-color-scheme:dark){body{background:${tokens.dark.bg};color:${tokens.dark.text}}p{color:${tokens.dark.muted}}a{background:${tokens.dark['primary-button']};color:${tokens.dark['on-primary']}}}</style><main><img src="/icons/makan-192.png" alt="${escape(copy.brand_name)}"><h1>${escape(copy.offline_heading)}</h1><p>${escape(copy.offline_description)}</p><a href="/personal">${escape(copy.offline_retry)}</a></main></html>\n`,
);
console.log('Generated offline and service-worker copy from the central catalog.');
