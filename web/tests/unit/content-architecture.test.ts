import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as copy from '@/content/fa';
import { network } from '@/config/network';
import { defaultBackTarget } from '@/config/navigation';
function files(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? ['content', 'generated'].includes(e.name)
          ? []
          : files(path.join(root, e.name))
        : /\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')
          ? [path.join(root, e.name)]
          : [],
    );
}
describe('editable content and endpoint architecture', () => {
  it('has no duplicated Persian interface literals outside the canonical catalog', () => {
    const leftovers: string[] = [];
    for (const file of files('src')) {
      const source = fs.readFileSync(file, 'utf8'),
        a = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      function visit(n: ts.Node) {
        if ((ts.isStringLiteralLike(n) || ts.isJsxText(n)) && /[\u0600-\u06ff]/.test(n.text))
          leftovers.push(file + ':' + n.getStart(a));
        ts.forEachChild(n, visit);
      }
      visit(a);
    }
    expect(leftovers).toEqual([]);
  });
  it('provides stable, shared login and navigation addresses', () => {
    expect(copy.auth_phoneLabel).toBe('شماره همراه');
    expect(copy.auth_codeLabel).toBe('کد ورود');
    expect(copy.navigation_extracurricular).toBe('فوق‌برنامه');
  });
  it('loads the editable endpoint settings from one JSON file', () => {
    expect(network).toEqual(JSON.parse(fs.readFileSync('config/network.json', 'utf8')));
    expect(network.timeouts.authentication).toBeLessThan(network.timeouts.upstream);
  });
  it('returns the study studio to the assistant even on direct entry', () => {
    expect(defaultBackTarget('/personal/assistant/studio')).toBe('/personal/assistant');
  });
  it('keeps the full reference atlas out of the common renderer and login imports', () => {
    expect(fs.readFileSync('src/features/reference/screen.tsx', 'utf8')).not.toContain(
      'blueprints.json',
    );
    expect(fs.readFileSync('src/features/auth/login.tsx', 'utf8')).not.toContain('ReferenceScreen');
  });
});
