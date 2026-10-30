import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageQueue, type QueuedMessage } from '@/features/personal/messaging/outbox';
import { ApiError } from '@/lib/api/errors';
const id = '00000000-0000-4000-8000-000000000001',
  conversationId = '00000000-0000-4000-8000-000000000002';
const pending: QueuedMessage = {
  id,
  userId: 'user-a',
  conversationId,
  scopeKey: 'Personal',
  command: { clientMessageId: id, kind: 'Text', text: 'fixture' },
  createdAt: '2026-10-28T00:00:00Z',
  state: 'sending',
};
const owner = { userId: pending.userId, conversationId, scopeKey: pending.scopeKey };
function setup() {
  const rows = new Map<string, QueuedMessage>();
  const remove = vi.fn(async (id: string) => {
    rows.delete(id);
  });
  const queue = new MessageQueue({
    list: async () => [...rows.values()],
    put: async (message) => {
      rows.set(message.id, message);
    },
    remove,
  });
  return { queue, rows, remove };
}
const receipt = {
  messageId: '00000000-0000-4000-8000-000000000003',
  conversationId,
  clientMessageId: id,
  sequence: 1,
  kind: 'Text' as const,
  sentAtUtc: '2026-10-28T00:00:00Z',
  status: 'Sent' as const,
  version: 'opaque',
};
afterEach(() => vi.useRealTimers());
describe('account and scope bound pending messages', () => {
  it('preserves the actual safety review denial without success, replay or hiding the reason', async () => {
    const { queue, rows, remove } = setup();
    const transport = vi
      .fn()
      .mockRejectedValue(new ApiError(422, { code: 'MESSAGE_SAFETY_REVIEW_REQUIRED' }));
    await expect(queue.send(pending, owner, transport)).rejects.toMatchObject({ status: 422 });
    expect(rows.get(id)?.state).toBe('rejected');
    expect(rows.get(id)?.error).toContain('بررسی ایمنی');
    expect(remove).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(rows.get(id)?.retryable).toBe(false);
    await expect(queue.send(rows.get(id)!, owner, transport)).rejects.toMatchObject({
      status: 422,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('refuses replay from another user, conversation, scope or logical message id before transport', async () => {
    const { queue, rows } = setup(),
      transport = vi.fn(async () => receipt);
    for (const foreign of [
      { ...owner, userId: 'user-b' },
      { ...owner, conversationId: 'other' },
      { ...owner, scopeKey: 'organization-b' },
    ])
      await expect(queue.send(pending, foreign, transport)).rejects.toMatchObject({ status: 409 });
    await expect(
      queue.send(
        { ...pending, command: { ...pending.command, clientMessageId: 'other' } },
        owner,
        transport,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(transport).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });
  it('keeps an uncertain operation and retries with the same frozen message id until a matching receipt arrives', async () => {
    const { queue, rows, remove } = setup(),
      transport = vi.fn().mockRejectedValueOnce(new ApiError(503)).mockResolvedValueOnce(receipt);
    await expect(queue.send(pending, owner, transport)).rejects.toMatchObject({ status: 503 });
    expect(rows.get(id)?.state).toBe('uncertain');
    expect(remove).not.toHaveBeenCalled();
    await queue.send(rows.get(id)!, owner, transport);
    expect(transport.mock.calls.map((call) => call[0].clientMessageId)).toEqual([id, id]);
    expect(rows.size).toBe(0);
  });
  it('does not turn a mismatched HTTP-success receipt into a sent message', async () => {
    const { queue, rows, remove } = setup();
    await expect(
      queue.send(pending, owner, async () => ({ ...receipt, clientMessageId: 'other' })),
    ).rejects.toMatchObject({ status: 502 });
    expect(rows.get(id)?.state).toBe('uncertain');
    expect(remove).not.toHaveBeenCalled();
  });
  it('honors server retry-after without automatically resubmitting', async () => {
    vi.useFakeTimers();
    const { queue, rows } = setup(),
      transport = vi.fn().mockRejectedValue(new ApiError(429, { retryAfter: 30 }));
    await expect(queue.send(pending, owner, transport)).rejects.toMatchObject({ status: 429 });
    expect(rows.get(id)?.state).toBe('rate-limited');
    await expect(queue.send(rows.get(id)!, owner, transport)).rejects.toMatchObject({
      status: 429,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('lists only the selected account and resource context', async () => {
    const { queue } = setup();
    await queue.put(pending);
    await queue.put({ ...pending, id: 'other-user', userId: 'user-b' });
    await queue.put({ ...pending, id: 'other-scope', scopeKey: 'organization-b' });
    expect(
      (await queue.list(owner.userId, conversationId, owner.scopeKey)).map((message) => message.id),
    ).toEqual([id]);
  });
});
