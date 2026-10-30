// Conservative source audit: dynamic module keys are retained rather than guessed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import postcss from 'postcss';
const apply = process.argv.includes('--apply'),
  files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk('src');
const modules = new Map(),
  strings = [];
for (const f of files.filter((f) => /\.tsx?$/.test(f) && !f.includes('generated'))) {
  const ast = ts.createSourceFile(
      f,
      fs.readFileSync(f, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      f.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    aliases = new Map();
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.name ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.endsWith('.module.css')
    )
      continue;
    const target = path.resolve(path.dirname(f), statement.moduleSpecifier.text);
    aliases.set(statement.importClause.name.text, target);
    if (!modules.has(target)) modules.set(target, { keys: new Set(), dynamic: false });
  }
  function visit(n) {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n)
    )
      strings.push(n.text);
    if (
      ts.isPropertyAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      aliases.has(n.expression.text)
    )
      modules.get(aliases.get(n.expression.text)).keys.add(n.name.text);
    if (
      ts.isElementAccessExpression(n) &&
      ts.isIdentifier(n.expression) &&
      aliases.has(n.expression.text)
    ) {
      const m = modules.get(aliases.get(n.expression.text));
      if (n.argumentExpression && ts.isStringLiteral(n.argumentExpression))
        m.keys.add(n.argumentExpression.text);
      else m.dynamic = true;
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
}
const text = strings.join(' '),
  report = [];
for (const file of files.filter(
  (f) =>
    f.endsWith('.css') &&
    !f.includes(path.join('design', 'tokens.css')) &&
    !f.endsWith('jalali-date-input.css'),
)) {
  const original = fs.readFileSync(file, 'utf8'),
    root = postcss.parse(original),
    module = modules.get(path.resolve(file)),
    removed = [];
  if (file.endsWith('.module.css') && (!module || module.dynamic)) {
    report.push({
      file,
      retained: true,
      reason: module
        ? 'Dynamic class indexing requires manual review'
        : 'Module reference not statically established',
    });
    continue;
  }
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.name.includes('keyframes')) return;
    const selectors = rule.selector.split(',');
    const kept = selectors.filter((selector) => {
      const local = selector.replace(/:global\([^)]*\)/g, ''),
        names = [...local.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);
      const unused = names.some((name) =>
        module
          ? !module.keys.has(name)
          : !name.startsWith('button-') &&
            !new RegExp('(^|[^\\w-])' + name + '([^\\w-]|$)').test(text),
      );
      if (unused) removed.push(selector.trim());
      return !unused;
    });
    if (!kept.length) rule.remove();
    else rule.selector = kept.join(',');
  });
  root.walkAtRules((rule) => {
    if (rule.nodes?.length === 0) rule.remove();
  });
  const content = root.toString();
  if (content === original) continue;
  report.push({
    file,
    beforeBytes: Buffer.byteLength(original),
    afterBytes: Buffer.byteLength(content),
    beforeSha256: crypto.createHash('sha256').update(original).digest('hex'),
    removedSelectors: removed,
    reason:
      'No static assignment/import for these local/global class selectors in application source; dynamic module selectors retained.',
  });
  if (apply) {
    const backup = path.join('tmp/quality-baseline/css', file);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, original);
    fs.writeFileSync(file, content);
  }
}
fs.mkdirSync('docs/quality', { recursive: true });
const reportPath = 'docs/quality/css-cleanup.json';
const prior = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
fs.writeFileSync(
  reportPath,
  JSON.stringify({ applied: apply, files: report, previous: prior }, null, 2),
);
console.log(
  JSON.stringify({
    applied: apply,
    changedFiles: report.filter((r) => r.removedSelectors).length,
    removedSelectors: report.reduce((n, r) => n + (r.removedSelectors?.length ?? 0), 0),
  }),
);
