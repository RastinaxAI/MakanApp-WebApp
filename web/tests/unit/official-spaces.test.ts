import { describe, it, expect } from 'vitest';
import type { components } from '@/generated/api/schema';
import {
  officialMetadataMatches,
  readableOfficialEndpoint,
  officialConversationCapabilities,
  academicActivityMatches,
  academicActivityHref,
  type OfficialPair,
} from '@/features/personal/messaging/official-model';
type S = components['schemas'];
const meta = {
  sourceKind: 'Class',
  sourceId: 'class',
  organizationId: 'org',
  purpose: 'Group',
  displayLabel: 'گروه رسمی',
  version: '1',
} as const;
const endpoint = {
  conversationId: 'group',
  state: 'Ready',
  capabilities: { canRead: true, canSend: false, canManage: false },
  official: meta,
  attemptCount: 0,
  lastFailureCategory: null,
};
const pair = (): OfficialPair => ({
  sourceKind: 'Class',
  sourceId: 'class',
  organizationId: 'org',
  version: '1',
  group: { ...endpoint },
  channel: {
    ...endpoint,
    conversationId: 'channel',
    state: 'RepairRequired',
    official: { ...meta, purpose: 'Channel' },
  },
});
const summary = (patch: Partial<S['ConversationSummaryResult']> = {}) =>
  ({
    conversationId: 'group',
    type: 'Group',
    scope: 'Organization',
    organizationId: 'org',
    title: 'نام دلخواه',
    official: meta,
    ...patch,
  }) as S['ConversationSummaryResult'];
const activity = {
  eventId: 'event',
  kind: 'Assignment',
  sourceId: 'task',
  sourceVersionId: 'version',
  sourceRevision: 1,
  organizationId: 'org',
  classId: 'class',
  destinationConversationId: 'group',
  destinationPurpose: 'Group',
  actorKind: 'User',
  initiatedByUserId: 'teacher',
  occurredAtUtc: '2026-10-30T00:00:00Z',
  title: 'تکلیف',
  dueAtUtc: null,
  availableFromUtc: null,
  availableUntilUtc: null,
  state: 'Published',
  isActionable: true,
} satisfies NonNullable<S['AcademicActivityCardResult']>;
describe('server-bound official spaces', () => {
  it('does not grant a badge from a title or an unbound boolean', () => {
    expect(
      officialMetadataMatches(summary({ title: 'گروه رسمی', official: null, isOfficial: true })),
    ).toBe(false);
    expect(officialMetadataMatches(summary({ organizationId: 'another-org' }))).toBe(false);
    expect(officialMetadataMatches(summary())).toBe(true);
  });
  it('keeps a readable group usable independently of a broken channel', () => {
    const p = pair();
    expect(readableOfficialEndpoint(p, 'Group')).toBe(true);
    expect(readableOfficialEndpoint(p, 'Channel')).toBe(false);
    expect(officialConversationCapabilities(summary(), p)?.canSend).toBe(false);
  });
  it('requires explicit read permission and the exact source and conversation bindings', () => {
    const p = pair();
    p.group.capabilities = { canRead: false, canSend: true, canManage: true };
    expect(readableOfficialEndpoint(p, 'Group')).toBe(false);
    expect(officialConversationCapabilities(summary(), p)).toBeNull();
    expect(
      officialConversationCapabilities(summary({ conversationId: 'another-chat' }), pair()),
    ).toBeNull();
    expect(
      officialConversationCapabilities(summary(), { ...pair(), sourceId: 'another-class' }),
    ).toBeNull();
  });
  it('renders structured activities only for matching System messages and official class bindings', () => {
    const m = {
      conversationId: 'group',
      originKind: 'System',
      academicActivity: activity,
    } as S['ConversationMessageResult'];
    expect(academicActivityMatches(m, summary())).toBe(true);
    expect(academicActivityMatches({ ...m, originKind: 'User' }, summary())).toBe(false);
    expect(
      academicActivityMatches(
        { ...m, academicActivity: { ...activity, classId: 'another-class' } },
        summary(),
      ),
    ).toBe(false);
    expect(academicActivityHref(activity)).toBe('/personal/education/assignments/task');
  });
});
