import { describe, expect, it } from 'vitest';
import type { components } from '@/generated/api/schema';
import { mergeInboxPages } from '@/features/personal/messaging/inbox-model';
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
describe('account inbox page merge', () => {
  it('keeps latest first-page copy when pagination shifts and orders pins before activity', () => {
    const current = row('a', '2026-11-01T12:00:00Z');
    expect(
      mergeInboxPages([
        [current, row('b', '2026-10-01T12:00:00Z', true)],
        [row('a', null), row('c', '2026-11-01T13:00:00Z')],
      ]),
    ).toEqual([row('b', '2026-10-01T12:00:00Z', true), row('c', '2026-11-01T13:00:00Z'), current]);
  });
  it('uses stable ids for conversations without messages without mutating source pages', () => {
    const page = [row('z', null), row('a', null)];
    expect(mergeInboxPages([page]).map((r) => r.conversationId)).toEqual(['a', 'z']);
    expect(page[0].conversationId).toBe('z');
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
describe('conversation management policy', () => {
  const value = (role: string, status = 'Active', policy = 'UserManaged') =>
    ({
      managementPolicy: policy,
      participants: [{ role, status, user: { userId: 'me' } }],
    }) as S['ManagedConversationResult'];
  it('requires active conversation ownership; education role is never inferred', () => {
    expect(canManageMembers(value('Owner'), 'me')).toBe(true);
    expect(canManageMembers(value('Member'), 'me')).toBe(false);
    expect(canManageMembers(value('Admin'), 'me')).toBe(false);
    expect(canManageMembers(value('Owner'), 'other')).toBe(false);
  });
  it('revokes controls when membership ends or the group is system managed', () => {
    expect(canManageMembers(value('Owner', 'Left'), 'me')).toBe(false);
    expect(canManageMembers(value('Owner', 'Removed'), 'me')).toBe(false);
    expect(canManageMembers(value('Owner', 'Active', 'SystemManagedAcademic'), 'me')).toBe(false);
  });
});

it('releases a definitive consent rejection while retaining ambiguous create results for idempotent retry', () => {
  expect(creationWasRejected(409, 'CONVERSATION_INVITATION_REQUIRED')).toBe(true);
  expect(creationWasRejected(503)).toBe(false);
  expect(creationWasRejected(409, 'UNKNOWN_CONFLICT')).toBe(false);
  expect(creationWasRejected(422)).toBe(true);
});
