export type SchoolSearchItem = {
  id: string;
  type: 'classes' | 'assignments' | 'exams';
  title: string;
  detail: string;
  href: string;
};
export function normalizeSchoolSearch(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[\u200c\s]+/g, ' ')
    .trim()
    .toLocaleLowerCase('fa');
}
export function filterSchoolSearch(items: SchoolSearchItem[], query: string, type: string) {
  const words = normalizeSchoolSearch(query).split(' ').filter(Boolean);
  return items.filter(
    (item) =>
      (type === 'all' || type === item.type) &&
      words.every((word) => normalizeSchoolSearch(item.title + ' ' + item.detail).includes(word)),
  );
}
export async function mapSchoolSearch<T, R>(
  items: T[],
  signal: AbortSignal,
  read: (item: T) => Promise<R>,
) {
  let next = 0;
  const result: R[] = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (next < items.length) {
        signal.throwIfAborted();
        const i = next++;
        result[i] = await read(items[i]);
      }
    }),
  );
  return result;
}
