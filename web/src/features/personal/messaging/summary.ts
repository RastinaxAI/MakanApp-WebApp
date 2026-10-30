import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';

export type ConversationSummary = components['schemas']['ConversationSummaryResult'];

// e11d4ec resolves Direct, Saved and managed chats independently of inbox paging.
export async function findConversationSummary(
  id: string,
  read: (path: string) => Promise<ConversationSummary>,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  signal?.throwIfAborted();
  const value = await read(`/api/v1/conversations/${encodeURIComponent(id)}/summary`);
  signal?.throwIfAborted();
  if (value.conversationId !== id) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return value;
}

export function isManagedConversation(type: string) {
  return type === 'Group' || type === 'Channel';
}
