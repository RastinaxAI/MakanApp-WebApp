import { describe, it, expect } from 'vitest';
import type { components } from '@/generated/api/schema';
import {
  visibleLocalMessages,
  type AcknowledgedMessage,
} from '@/features/personal/messaging/message-reconciliation';
import type { QueuedMessage } from '@/features/personal/messaging/outbox';
type M = components['schemas']['ConversationMessageResult'];
const queued = {
  id: 'client-a',
  userId: 'me',
  conversationId: 'chat-a',
  scopeKey: 'Personal',
  command: { clientMessageId: 'client-a', kind: 'Text', text: 'سلام' },
  createdAt: '2026-11-01T00:00:00Z',
  state: 'sending',
} satisfies QueuedMessage;
const ack = {
  receipt: {
    messageId: 'server-a',
    clientMessageId: 'client-a',
    conversationId: 'chat-a',
    sequence: 1,
    kind: 'Text',
    sentAtUtc: queued.createdAt,
    status: 'Sent',
    version: 'v1',
  },
  text: 'سلام',
} satisfies AcknowledgedMessage;
const message = {
  messageId: 'server-a',
  clientMessageId: 'client-a',
  senderUserId: 'me',
  conversationId: 'chat-a',
} as M;
const view = (history: M[], receipts: AcknowledgedMessage[], pending: QueuedMessage[]) =>
  visibleLocalMessages(history, receipts, pending, 'me', 'chat-a');
describe('one visible copy through queue, receipt and history', () => {
  it('shows the outbox before confirmation and keeps an acknowledged message during delayed history', () => {
    expect(view([], [], [queued]).pending).toEqual([queued]);
    const result = view([], [ack], [queued]);
    expect(result.acknowledged).toEqual([ack]);
    expect(result.pending).toEqual([]);
  });
  it('history immediately replaces both local representations before asynchronous storage cleanup', () => {
    expect(view([message], [ack], [queued])).toEqual({ acknowledged: [], pending: [] });
  });
  it('matches a confirmed server id even when a history client id is absent or normalized', () => {
    expect(view([{ ...message, clientMessageId: 'normalized' }], [ack], [queued])).toEqual({
      acknowledged: [],
      pending: [],
    });
  });
  it('never deduplicates another sender using the same client id', () => {
    const result = view(
      [{ ...message, messageId: 'peer-message', senderUserId: 'peer' }],
      [ack],
      [queued],
    );
    expect(result.acknowledged).toEqual([ack]);
    expect(result.pending).toEqual([]);
  });
  it('keeps distinct messages with identical text', () => {
    const second = {
      ...queued,
      id: 'client-b',
      command: { ...queued.command, clientMessageId: 'client-b' },
    };
    expect(view([message], [ack], [second]).pending).toEqual([second]);
  });
  it('keeps rejected and uncertain messages visible without a confirmed receipt', () => {
    for (const state of ['rejected', 'uncertain'] as const) {
      const row = { ...queued, state, error: 'ارسال تأیید نشد' };
      expect(view([], [], [row]).pending).toEqual([row]);
    }
  });
  it('does not render receipts or pending records from another account or conversation', () => {
    expect(
      view(
        [],
        [{ ...ack, receipt: { ...ack.receipt, conversationId: 'other' } }],
        [
          { ...queued, userId: 'other' },
          { ...queued, conversationId: 'other' },
        ],
      ),
    ).toEqual({ acknowledged: [], pending: [] });
  });
  it('does not mutate history, receipts or attachments during reconciliation', () => {
    const withFile = { ...ack, attachments: [] };
    view([message], [withFile], [queued]);
    expect(withFile.text).toBe('سلام');
    expect(withFile.attachments).toEqual([]);
    expect(queued.state).toBe('sending');
  });
});
