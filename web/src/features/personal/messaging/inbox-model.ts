import type { components } from '@/generated/api/schema';
type Summary = components['schemas']['ConversationSummaryResult'];
// This is the order of the loaded scope pages, not a claim of global server pagination.
export function mergeInboxPages(pages: readonly (readonly Summary[])[]): Summary[] {
  const byId = new Map<string, Summary>();
  for (const page of pages)
    for (const item of page) {
      if (!byId.has(item.conversationId)) byId.set(item.conversationId, item);
    }
  return [...byId.values()].sort(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      (Date.parse(b.lastMessageAtUtc ?? '') || 0) - (Date.parse(a.lastMessageAtUtc ?? '') || 0) ||
      a.conversationId.localeCompare(b.conversationId),
  );
}
