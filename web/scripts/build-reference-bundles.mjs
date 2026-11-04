import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
const root = 'src/features/reference';
await fs.mkdir(root + '/bundles', { recursive: true });
async function allFiles(dir) {
  const rows = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['views', 'bundles', 'generated', 'content'].includes(e.name))
        rows.push(...(await allFiles(file)));
    } else if (/\.tsx?$/.test(file) && !file.endsWith('.d.ts')) rows.push(file);
  }
  return rows;
}
let count = 0;
for (const file of await allFiles('src')) {
  if ([root + '/screen.tsx', root + '/types.ts', root + '/registry.ts'].includes(file)) continue;
  let source = await fs.readFile(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  if (
    !ast.statements.some(
      (st) =>
        ts.isImportDeclaration(st) &&
        /reference\/(screen|frame)$|^\.\/(screen|frame)$/.test(st.moduleSpecifier.text),
    )
  )
    continue;
  const ids = new Set();
  function visit(n) {
    if (ts.isStringLiteralLike(n) && /^MK-\d\d$/.test(n.text)) ids.add(n.text);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (file === root + '/preview.tsx')
    for (let i = 1; i <= 82; i++) ids.add('MK-' + String(i).padStart(2, '0'));
  if (file === root + '/education-preview.tsx')
    for (const i of [44, 45, 46, ...Array.from({ length: 23 }, (_, n) => 60 + n)])
      ids.add('MK-' + i);
  if (!ids.size) continue;
  const name = file
    .slice(4)
    .replace(/\.(tsx?|jsx?)$/, '')
    .replaceAll('/', '-')
    .replace(/[^\w-]/g, '_');
  const sorted = [...ids].sort();
  await fs.writeFile(
    root + '/bundles/' + name + '.ts',
    "// Generated explicit route dependencies, not an eager global screen atlas.\nimport {registerBlueprints} from '../registry';\n" +
      sorted.map((id, i) => `import view${i} from '../views/${id}';`).join('\n') +
      '\nregisterBlueprints([' +
      sorted.map((_, i) => 'view' + i).join(',') +
      ']);\n',
  );
  const statement = "import '@/features/reference/bundles/" + name + "';\n";
  if (!source.includes(statement.trim()))
    source = source.startsWith("'use client';")
      ? source.replace("'use client';", "'use client';\n" + statement)
      : statement + source;
  await fs.writeFile(file, source);
  count++;
}
await fs.unlink(root + '/blueprints.json').catch(() => {});
console.log('Split reference imports across ' + count + ' explicit feature bundles.');
