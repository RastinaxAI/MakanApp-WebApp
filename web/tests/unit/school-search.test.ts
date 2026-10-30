import { describe, expect, it } from 'vitest';
import {
  filterSchoolSearch,
  mapSchoolSearch,
  normalizeSchoolSearch,
} from '@/features/personal/school/search-model';
import { submissionFileError } from '@/lib/submission-file';
describe('authorized school search helpers', () => {
  it('matches Persian and Arabic letters, spacing and diacritics without searching unrelated types', () => {
    const items = [
      { id: 'a', type: 'classes' as const, title: 'كلاس رياضي', detail: 'پایه نهم', href: '/a' },
      {
        id: 'b',
        type: 'assignments' as const,
        title: 'تکلیف ریاضی',
        detail: 'پایه هشتم',
        href: '/b',
      },
    ];
    expect(normalizeSchoolSearch('  رِيَاضی‌  نهم ')).toBe('ریاضی نهم');
    expect(filterSchoolSearch(items, 'ریاضی نهم', 'all').map((x) => x.id)).toEqual(['a']);
    expect(filterSchoolSearch(items, 'ریاضی', 'assignments').map((x) => x.id)).toEqual(['b']);
  });
  it('bounds concurrent requests and preserves all class results without a hidden item cap', async () => {
    let active = 0,
      maximum = 0;
    const values = Array.from({ length: 17 }, (_, i) => i);
    const results = await mapSchoolSearch(values, new AbortController().signal, async (i) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return i * 2;
    });
    expect(results).toEqual(values.map((i) => i * 2));
    expect(maximum).toBeLessThanOrEqual(4);
  });
  it('does not start work after a context search was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    let count = 0;
    await expect(
      mapSchoolSearch([1, 2], controller.signal, async () => {
        count++;
        return true;
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(count).toBe(0);
  });
});
describe('submission file selection', () => {
  it('accepts supported photos and PDFs, including a browser with an empty MIME', () => {
    for (const [name, type] of [
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
      ['a.pdf', 'application/pdf'],
      ['a.PDF', ''],
    ])
      expect(submissionFileError({ name, type, size: 10 })).toBe('');
  });
  it('rejects empty content, active SVG and a misleading extension with an executable MIME', () => {
    for (const file of [
      { name: 'a.pdf', type: 'application/pdf', size: 0 },
      { name: 'a.svg', type: 'image/svg+xml', size: 10 },
      { name: 'a.jpg', type: 'application/x-msdownload', size: 10 },
    ])
      expect(submissionFileError(file)).not.toBe('');
  });
});
