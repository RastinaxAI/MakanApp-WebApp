import { it, expect } from 'vitest';
import { parseTextDraft, clearDraftStorage } from '@/lib/draft-storage';
it('rejects corrupt drafts and never treats arbitrary objects as a draft command', () => {
  for (const v of ['null', '{"text":12,"version":"1"}', 'bad json'])
    expect(parseTextDraft(v)).toBeUndefined();
  expect(parseTextDraft('{"text":"پاسخ","version":"v1","extra":"ignored"}')).toEqual({
    text: 'پاسخ',
    version: 'v1',
  });
});
it('clears only product draft keys on logout', () => {
  const data = new Map([
    ['makan:draft:userA:orgA', 'x'],
    ['makan-theme', 'dark'],
  ]);
  const storage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => data.delete(k),
  };
  clearDraftStorage(storage);
  expect([...data]).toEqual([['makan-theme', 'dark']]);
});
