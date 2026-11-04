// Move static UI copy to one editable, tree-shakable ESM catalog; keep API/user data separate.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import prettier from 'prettier';
const catalogPath = 'src/content/fa.ts';
const entries = new Map(),
  uses = new Map();
try {
  const previous = JSON.parse(await fs.readFile('design/content-addresses.json', 'utf8'));
  for (const [key, files] of Object.entries(previous.consumers)) uses.set(key, new Set(files));
} catch {}
const known = {
  'شماره همراه': 'auth_phoneLabel',
  'کد ورود': 'auth_codeLabel',
  'دریافت کد تأیید': 'auth_requestCode',
  'تأیید و ورود': 'auth_verify',
  'شماره همراه شما': 'auth_phoneTitle',
  'کد ورود را وارد کنید': 'auth_codeTitle',
  بازگشت: 'common_back',
  ماکان: 'brand_name',
  'خروج از حساب': 'account_logout',
  فوق‌برنامه: 'navigation_extracurricular',
  آموزشگاه: 'navigation_education',
  دستیار: 'navigation_assistant',
  پیام‌ها: 'navigation_messages',
  پروفایل: 'navigation_profile',
  تنظیمات: 'navigation_settings',
};
const persian = /[\u0600-\u06ff]/;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
let existing = '';
try {
  existing = await fs.readFile(catalogPath, 'utf8');
} catch {}
const existingAst = ts.createSourceFile(catalogPath, existing, ts.ScriptTarget.Latest, true);
for (const statement of existingAst.statements)
  if (ts.isVariableStatement(statement))
    for (const d of statement.declarationList.declarations)
      if (ts.isIdentifier(d.name) && d.initializer)
        entries.set(d.name.text, d.initializer.getText(existingAst));
function string(value, file) {
  const key = known[value] ?? 'text_' + hash(value);
  if (!entries.has(key)) entries.set(key, JSON.stringify(value));
  if (!uses.has(key)) uses.set(key, new Set());
  uses.get(key).add(file);
  return 'uiText.' + key;
}
function template(parts, file) {
  const key = 'format_' + hash(JSON.stringify(parts));
  if (!entries.has(key)) {
    const body = parts
      .map(
        (p, i) =>
          p.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${') +
          (i < parts.length - 1 ? '${value' + i + '}' : ''),
      )
      .join('');
    entries.set(
      key,
      '(' +
        parts
          .slice(1)
          .map((_, i) => 'value' + i + ': unknown')
          .join(', ') +
        ') => `' +
        body +
        '`',
    );
  }
  if (!uses.has(key)) uses.set(key, new Set());
  uses.get(key).add(file);
  return 'uiText.' + key;
}
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
  return lines
    .map((line, i) => {
      let text = line.replaceAll('\t', ' ');
      if (i !== 0) text = text.replace(/^ +/, '');
      if (i !== lines.length - 1) text = text.replace(/ +$/, '');
      return text + (text && i !== last ? ' ' : '');
    })
    .join('')
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,
      (_, v) =>
        ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' })[v] ??
        String.fromCodePoint(
          v.startsWith('#x') ? parseInt(v.slice(2), 16) : parseInt(v.slice(1), 10),
        ),
    );
}
async function filesIn(root) {
  let result = [];
  for (const e of await fs.readdir(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      if (!['generated', 'content', 'views', 'bundles'].includes(e.name))
        result.push(...(await filesIn(p)));
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) result.push(p);
  }
  return result.sort();
}
let changed = 0,
  literals = 0;
for (const file of await filesIn('src')) {
  const source = await fs.readFile(file, 'utf8');
  const imported = source.includes("from '@/content/fa'");
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function rewrite(root) {
    const edits = [];
    function walk(node) {
      if (ts.isTemplateExpression(node) && persian.test(node.getText(ast))) {
        const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)],
          args = node.templateSpans.map((s) => rewrite(s.expression));
        edits.push({
          a: node.getStart(ast),
          b: node.end,
          text: template(parts, file) + '(' + args.join(',') + ')',
        });
        literals++;
        return;
      }
      if (ts.isJsxText(node)) {
        const value = jsxText(node.text);
        if (value.trim()) {
          edits.push({ a: node.pos, b: node.end, text: '{' + string(value, file) + '}' });
          literals++;
        }
        return;
      }
      if (ts.isStringLiteralLike(node)) {
        const attr = ts.isJsxAttribute(node.parent) ? node.parent.name.getText(ast) : '';
        if (
          persian.test(node.text) ||
          (['aria-label', 'title', 'alt', 'placeholder', 'description'].includes(attr) && node.text)
        ) {
          let a = node.getStart(ast),
            b = node.end,
            text = string(node.text, file);
          if (ts.isJsxAttribute(node.parent)) text = '{' + text + '}';
          else if (
            (ts.isPropertyAssignment(node.parent) ||
              ts.isPropertySignature(node.parent) ||
              ts.isMethodDeclaration(node.parent)) &&
            node.parent.name === node
          )
            text = '[' + text + ']';
          else if (ts.isLiteralTypeNode(node.parent)) {
            a = node.parent.getStart(ast);
            b = node.parent.end;
            text = 'typeof ' + text;
          }
          if (ts.isAsExpression(node.parent) && node.parent.type.getText(ast) === 'const') {
            a = node.parent.getStart(ast);
            b = node.parent.end;
          }
          edits.push({ a, b, text });
          literals++;
          return;
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(root);
    let result = source.slice(root.getStart(ast), root.end);
    for (const e of edits.sort((a, b) => b.a - a.a))
      result =
        result.slice(0, e.a - root.getStart(ast)) + e.text + result.slice(e.b - root.getStart(ast));
    return result;
  }
  const transformed = rewrite(ast);
  if (transformed === source.slice(ast.getStart(ast))) continue;
  const withImport = imported
    ? transformed
    : transformed.replace(
        /^(('use client'|"use client");?)/,
        `$1\nimport * as uiText from '@/content/fa';`,
      );
  await fs.writeFile(
    file,
    withImport === transformed && !imported
      ? "import * as uiText from '@/content/fa';\n" + transformed
      : withImport,
  );
  changed++;
}
// Design inputs remain archived, but runtime screen modules address the same text catalog.
const { directory: referenceDirectory } = JSON.parse(
  await fs.readFile('design/reference.json', 'utf8'),
);
const blueprintSource = referenceDirectory + '/blueprints.source.json';
await fs.mkdir(path.dirname(blueprintSource), { recursive: true });
try {
  await fs.access(blueprintSource);
} catch {
  await fs.copyFile('src/features/reference/blueprints.json', blueprintSource);
}
const blueprints = JSON.parse(await fs.readFile(blueprintSource, 'utf8'));
await fs.mkdir('src/features/reference/views', { recursive: true });
function emit(value, file) {
  if (typeof value === 'string')
    return persian.test(value) ? string(value, file) : JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((x) => emit(x, file)).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .map(([k, v]) => JSON.stringify(k) + ':' + emit(v, file))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
const options = await prettier.resolveConfig(catalogPath);
for (const blueprint of blueprints) {
  const file = 'src/features/reference/views/' + blueprint.id + '.ts';
  await fs.writeFile(
    file,
    await prettier.format(
      "// Generated screen structure; editable copy lives in src/content/fa.ts.\nimport * as uiText from '@/content/fa';\nimport type {ReferenceBlueprint} from '../types';\nconst view=" +
        emit(blueprint, file) +
        ' as unknown as ReferenceBlueprint;\nexport default view;\n',
      { ...options, parser: 'typescript' },
    ),
  );
}
await fs.mkdir('src/content', { recursive: true });
await fs.writeFile(
  catalogPath,
  await prettier.format(
    '// Canonical Persian interface copy. Named exports keep unused text out of route bundles.\n// Edit values here; keep identifiers stable. Parameters are inserted as text, never HTML.\n' +
      [...entries]
        .map(
          ([key, initializer]) =>
            'export const ' +
            key +
            (key.startsWith('format_') ? '' : ': string') +
            ' = ' +
            initializer +
            ';',
        )
        .join('\n')
        .replace(/(export const format_[\s\S]*?`)( as const;)/g, '$1;'),
    { ...options, parser: 'typescript' },
  ),
);
await fs.writeFile(
  'design/content-addresses.json',
  JSON.stringify(
    {
      catalog: catalogPath,
      entries: entries.size,
      consumers: Object.fromEntries([...uses].map(([key, value]) => [key, [...value]])),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    filesChanged: changed,
    literals,
    catalogEntries: entries.size,
    referenceModules: blueprints.length,
  }),
);
