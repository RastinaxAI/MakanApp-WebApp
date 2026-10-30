import { describe, expect, it } from 'vitest';
import {
  canWriteConversation,
  mediaRestricted,
  visibleReply,
  type Conversation,
} from '@/features/personal/messaging/model';
const userId = '00000000-0000-0000-0000-000000000001';
const conversation = (patch: Partial<Conversation> = {}) =>
  ({
    status: 'Active',
    type: 'Direct',
    memberCapabilities: 'None',
    participants: [
      { user: { userId }, role: 'Member', status: 'Active', adminPermissions: 'None' },
    ],
    ...patch,
  }) as Conversation;
describe('conversation policy uses conversation membership, never educational role', () => {
  it('blocks effective media or message restrictions, but not expired or unrelated capabilities', () => {
    for (const flag of ['All', 'SendMessages', 'SendMedia'])
      expect(
        mediaRestricted({ isEffective: true, isBanned: false, deniedCapabilities: flag }),
      ).toBe(true);
    expect(mediaRestricted({ isEffective: false, isBanned: true, deniedCapabilities: 'All' })).toBe(
      false,
    );
    expect(
      mediaRestricted({ isEffective: true, isBanned: false, deniedCapabilities: 'ChangeInfo' }),
    ).toBe(false);
  });
  it('allows an active direct participant independently of organization role and denies a removed participant', () => {
    expect(canWriteConversation(conversation(), userId)).toBe(true);
    expect(canWriteConversation(conversation(), 'another-user')).toBe(false);
    expect(canWriteConversation(conversation({ status: 'Archived' }), userId)).toBe(false);
    expect(
      canWriteConversation(
        conversation({ participants: [{ ...conversation().participants[0], status: 'Removed' }] }),
        userId,
      ),
    ).toBe(false);
  });
  it('separates channel publishing from ordinary membership and group capability flags', () => {
    expect(canWriteConversation(conversation({ type: 'Channel' }), userId)).toBe(false);
    expect(
      canWriteConversation(
        conversation({ type: 'Group', memberCapabilities: 'SendMessages, SendFiles' }),
        userId,
      ),
    ).toBe(true);
    const participants = [
      {
        ...conversation().participants[0],
        role: 'Admin' as const,
        adminPermissions: 'PublishMessages, ManageMessages',
      },
    ];
    expect(canWriteConversation(conversation({ type: 'Channel', participants }), userId)).toBe(
      true,
    );
    expect(
      canWriteConversation(
        conversation({ type: 'Group', memberCapabilities: 'LegacyMemberDefault' }),
        userId,
      ),
    ).toBe(true);
    expect(
      canWriteConversation(
        conversation({ type: 'Group', memberCapabilities: 'UnknownFlag' }),
        userId,
      ),
    ).toBe(false);
  });
  it('never displays a redacted or deleted reply text', () => {
    const reply = {
      text: 'restricted content',
      isUnavailable: true,
      isDeleted: false,
    } as NonNullable<Parameters<typeof visibleReply>[0]>;
    expect(visibleReply(reply)).toBe('پیام در دسترس نیست');
    expect(visibleReply({ ...reply, isUnavailable: false, isDeleted: true })).toBe(
      'پیام حذف شده است',
    );
  });
});
