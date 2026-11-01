import type { components } from '@/generated/api/schema';
import type { QueuedMessage } from './outbox';
type S = components['schemas'];
export type AcknowledgedMessage = {
  receipt: S['MessageReceiptResult'];
  text: string;
  attachments?: S['MessageAttachmentResult'][];
};
/** History wins, then validated receipts, then the local outbox. Match identity, never text. */
export function visibleLocalMessages(
  history: S['ConversationMessageResult'][],
  receipts: AcknowledgedMessage[],
  queue: QueuedMessage[],
  userId: string,
  conversationId: string,
) {
  const own = history.filter(
    (m) => m.senderUserId === userId && m.conversationId === conversationId,
  );
  const serverIds = new Set(own.map((m) => m.messageId));
  const serverClientIds = new Set(own.map((m) => m.clientMessageId));
  const confirmed = receipts.filter((m) => m.receipt.conversationId === conversationId);
  const confirmedClientIds = new Set(confirmed.map((m) => m.receipt.clientMessageId));
  return {
    acknowledged: confirmed.filter(
      (m) => !serverIds.has(m.receipt.messageId) && !serverClientIds.has(m.receipt.clientMessageId),
    ),
    pending: queue.filter(
      (m) =>
        m.userId === userId &&
        m.conversationId === conversationId &&
        !serverClientIds.has(m.id) &&
        !confirmedClientIds.has(m.id),
    ),
  };
}
