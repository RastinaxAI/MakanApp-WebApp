import { describe, expect, it, vi } from 'vitest';
import {
  findConversationSummary,
  isManagedConversation,
  type ConversationSummary,
} from '@/features/personal/messaging/summary';

const row = (conversationId: string): ConversationSummary => ({
  conversationId,
  type: 'Direct',
  scope: 'Personal',
  organizationId: null,
  title: null,
  otherParticipant: null,
  lastMessagePreview: null,
  lastMessageAtUtc: null,
  lastMessageSequence: null,
  lastDeliveredMessageSequence: 0,
  lastReadMessageSequence: 0,
  unreadCount: 0,
  unreadMentionCount: 0,
  isArchived: false,
  isMuted: false,
  muteMode: 'None',
  mutedUntilUtc: null,
  isPinned: false,
  isManuallyUnread: false,
  organization: null,
});
describe('conversation identity without managed-group metadata', () => {
  it('resolves a direct deep link independently of inbox paging', async () => {
    const read = vi.fn().mockResolvedValue(row('target'));
    expect((await findConversationSummary('target', read)).conversationId).toBe('target');
    expect(read.mock.calls.map(([path]) => path)).toEqual(['/api/v1/conversations/target/summary']);
  });
  it('can reopen an archived direct conversation', async () => {
    const read = vi.fn().mockResolvedValue({ ...row('target'), isArchived: true });
    expect((await findConversationSummary('target', read)).isArchived).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('preserves access failures and cancellation instead of inventing conversation membership', async () => {
    const denied = Object.assign(new Error('denied'), { status: 403 });
    const read = vi.fn().mockRejectedValue(denied);
    await expect(findConversationSummary('target', read)).rejects.toBe(denied);
    const controller = new AbortController();
    controller.abort();
    read.mockClear();
    await expect(findConversationSummary('target', read, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects mismatching identities instead of displaying another chat', async () => {
    await expect(
      findConversationSummary('missing', vi.fn().mockResolvedValue(row('other'))),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('uses management metadata only for groups and channels', () => {
    expect(['Direct', 'Saved'].map(isManagedConversation)).toEqual([false, false]);
    expect(['Group', 'Channel'].map(isManagedConversation)).toEqual([true, true]);
  });
});
