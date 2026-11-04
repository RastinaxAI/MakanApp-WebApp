import { describe, it, expect } from 'vitest';
import type { components } from '@/generated/api/schema';
import {
  sourceAiSelectable,
  sourceDownloadable,
  sourceReadiness,
  preflightMessage,
} from '@/features/personal/sources/model';
import { conversationCapability } from '@/features/personal/messaging/management-policy';
import { academicActivityHref } from '@/features/personal/messaging/official-model';
type S = components['schemas'];
const source = {
  scope: 'Personal',
  fileReady: true,
  sourceReady: false,
  aiReady: false,
  file: { status: 'Ready' },
  capabilities: { canUseForAi: true, canDownload: true },
} as S['EducationalSourceResult'];
describe('release 154c437 source invariants', () => {
  it('keeps file/source/AI readiness independent', () => {
    expect(sourceReadiness(source).map((item) => item.ready)).toEqual([true, false, false]);
    expect(sourceAiSelectable(source)).toBe(false);
    expect(sourceDownloadable(source)).toBe(true);
    expect(sourceAiSelectable({ ...source, sourceReady: true, aiReady: true })).toBe(true);
    expect(
      sourceAiSelectable({
        ...source,
        sourceReady: true,
        aiReady: true,
        capabilities: { ...source.capabilities, canUseForAi: false },
      }),
    ).toBe(false);
  });
  it('denies Library binary/AI even when contradictory capability data is present', () => {
    expect(sourceDownloadable({ ...source, scope: 'Library' })).toBe(false);
    expect(sourceAiSelectable({ ...source, scope: 'Library' })).toBe(false);
  });
  it('requires file readiness and explicit download capability', () => {
    expect(sourceDownloadable(source)).toBe(true);
    expect(sourceDownloadable({ ...source, fileReady: false })).toBe(false);
    expect(
      sourceDownloadable({
        ...source,
        capabilities: { ...source.capabilities, canDownload: false },
      }),
    ).toBe(false);
  });
  it('requires independent capabilities for editing, admins and invitations', () => {
    const value = {
      effectiveCapabilities: {
        canEditInfo: true,
        canManageMembers: false,
        canManageAdmins: false,
        canManageInvites: false,
      },
    } as S['ManagedConversationResult'];
    expect(conversationCapability(value, 'canEditInfo')).toBe(true);
    for (const key of ['canManageMembers', 'canManageAdmins', 'canManageInvites'] as const)
      expect(conversationCapability(value, key)).toBe(false);
  });
  it('makes unavailable retrieval explicit without claiming an AI output', () => {
    expect(
      preflightMessage({
        authorized: true,
        retrievalAvailable: false,
      } as S['AiSourcePreflightResult']),
    ).toContain('انتخاب منابع حفظ شده');
  });
  it('routes session activity to the actual class schedule', () => {
    expect(
      academicActivityHref({ kind: 'Session', classId: 'class' } as NonNullable<
        S['AcademicActivityCardResult']
      >),
    ).toBe('/personal/education/classes/class?tab=sessions');
  });
});
