import { describe, expect, it } from 'vitest';
import type { components } from '@/generated/api/schema';
import { flattenAccountInbox } from '@/features/personal/messaging/inbox-model';
import {
  readCreationDraft,
  creationWasRejected,
} from '@/features/personal/messaging/creation-draft';
import { canManageMembers } from '@/features/personal/messaging/management-policy';
type S = components['schemas'];
const row = (id: string, time: string | null, pinned = false) =>
  ({
    conversationId: id,
    lastMessageAtUtc: time,
    isPinned: pinned,
  }) as S['ConversationSummaryResult'];
describe('server paginated account inbox', () => {
  const page = (items: S['ConversationSummaryResult'][]): S['AccountInboxPageResult'] => ({
    items,
    nextCursor: null,
    hasMore: false,
  });
  it('preserves server ordering even when pins and dates suggest a different client sort', () => {
    const first = row('z', null),
      second = row('a', '2026-11-01T12:00:00Z', true);
    expect(flattenAccountInbox([page([first, second])])).toEqual([first, second]);
  });
  it('keeps the first authoritative copy when cursor pages overlap without mutating input', () => {
    const current = row('a', null),
      items = [row('z', null), current];
    expect(
      flattenAccountInbox([page(items), page([row('a', '2026-11-02T12:00:00Z'), row('b', null)])]),
    ).toEqual([...items, row('b', null)]);
    expect(items.map((item) => item.conversationId)).toEqual(['z', 'a']);
  });
});
describe('creation draft recovery', () => {
  const value = {
    title: 'گروه',
    description: 'توضیح',
    visibility: 'Private',
    history: 'FromJoin',
    selected: ['00000000-0000-4000-8000-000000000102'],
  };
  it('restores valid draft selections and access without creating an operation', () => {
    expect(readCreationDraft(JSON.stringify(value))).toEqual(value);
  });
  it.each([
    null,
    '{',
    'null',
    '{}',
    JSON.stringify({ ...value, selected: ['not-a-user-id'] }),
    JSON.stringify({ ...value, visibility: 'Unexpected' }),
  ])('rejects malformed drafts: %s', (raw) => {
    expect(readCreationDraft(raw)).toBeNull();
  });
});
describe('server effective conversation capabilities', () => {
  const value = (role: string, caps?: Partial<S['ConversationEffectiveCapabilities']>) =>
    ({
      participants: [{ role, status: 'Active', user: { userId: 'me' } }],
      effectiveCapabilities: caps,
    }) as S['ManagedConversationResult'];
  it('never grants management by Owner, Admin or school role when the server flag is missing or false', () => {
    for (const role of ['Owner', 'Admin', 'Teacher', 'Manager'])
      expect(canManageMembers(value(role), 'me')).toBe(false);
    expect(canManageMembers(value('Owner', { canManageMembers: false }), 'me')).toBe(false);
  });
  it('honors effective management independently of the displayed roster role', () => {
    expect(canManageMembers(value('Member', { canManageMembers: true }), 'me')).toBe(true);
    expect(
      canManageMembers(
        {
          ...value('Member', { canManageMembers: true }),
          managementPolicy: 'SystemManagedAcademic',
        },
        'me',
      ),
    ).toBe(true);
  });
});

it('releases a definitive consent rejection while retaining ambiguous create results for idempotent retry', () => {
  expect(creationWasRejected(409, 'CONVERSATION_INVITATION_REQUIRED')).toBe(true);
  expect(creationWasRejected(503)).toBe(false);
  expect(creationWasRejected(409, 'UNKNOWN_CONFLICT')).toBe(false);
  expect(creationWasRejected(422)).toBe(true);
});
