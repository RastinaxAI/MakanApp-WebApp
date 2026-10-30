export type TextDraft = { text: string; version: string };
export const draftPrefix = 'makan:draft:';
export function parseTextDraft(value: string | null): TextDraft | undefined {
  try {
    const data: unknown = JSON.parse(value ?? 'null');
    if (
      data &&
      typeof data === 'object' &&
      'text' in data &&
      'version' in data &&
      typeof data.text === 'string' &&
      typeof data.version === 'string'
    )
      return { text: data.text, version: data.version };
  } catch {
    /* Invalid browser state is ignored, never sent as an API command. */
  }
}
export function clearDraftStorage(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (key?.startsWith(draftPrefix)) storage.removeItem(key);
  }
}
