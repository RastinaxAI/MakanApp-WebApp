import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  incremental: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
      getCanonicalFileName: (f) => f,
    }),
  );
  process.exitCode = 1;
}
const graph = new Map();
for (const source of program
  .getSourceFiles()
  .filter(
    (s) =>
      s.fileName.replaceAll(path.sep, '/').includes('/src/') &&
      !s.fileName.replaceAll(path.sep, '/').includes('/generated/'),
  )) {
  const deps = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const specifier = statement.moduleSpecifier.text;
    if (
      (source.fileName.replaceAll(path.sep, '/').includes('/components/ui/') ||
        source.fileName.replaceAll(path.sep, '/').includes('/lib/')) &&
      specifier.includes('/features/')
    )
      throw Error('Shared layer depends on feature: ' + source.fileName);
    const resolved = ts.resolveModuleName(specifier, source.fileName, parsed.options, ts.sys)
      .resolvedModule?.resolvedFileName;
    if (resolved && !resolved.includes('node_modules')) deps.push(resolved);
  }
  graph.set(source.fileName, deps);
}
const done = new Set(),
  visiting = new Set();
function visit(file, trail = []) {
  if (visiting.has(file)) throw Error('Dependency cycle: ' + [...trail, file].join(' -> '));
  if (done.has(file)) return;
  visiting.add(file);
  for (const target of graph.get(file) ?? []) visit(target, [...trail, file]);
  visiting.delete(file);
  done.add(file);
}
if (!graph.size) throw Error('No source modules found');
for (const file of graph.keys()) visit(file);
console.log(`Checked unused declarations and ${graph.size} source module boundaries; no cycles.`);
