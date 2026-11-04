import type { components } from '@/generated/api/schema';
type Summary = components['schemas']['ConversationSummaryResult'];
/** Preserve server-wide ordering; opaque cursor pages must never be sorted by the client. */
export function flattenAccountInbox(
  pages: readonly components['schemas']['AccountInboxPageResult'][],
): Summary[] {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter((item) => {
      if (seen.has(item.conversationId)) return false;
      seen.add(item.conversationId);
      return true;
    });
}
