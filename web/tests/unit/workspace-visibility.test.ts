import { describe, it, expect } from 'vitest';
import type { components } from '@/generated/api/schema';
import { visibleWorkspaces, canEnterWorkspace } from '@/features/personal/workspace-model';
type S = components['schemas'];
const personal: S['WorkspaceResult'] = {
  workspaceType: 'Personal',
  organizationId: null,
  organizationName: null,
  membershipId: null,
  role: null,
  displayName: 'شخصی',
  status: 'Active',
  isVisible: true,
  canEnter: true,
};
const school: S['WorkspaceResult'] = {
  ...personal,
  workspaceType: 'Organization',
  organizationId: 'org',
  membershipId: 'member',
  role: 'Teacher',
  displayName: 'آموزشگاه',
};
const snapshot = (
  patch: Partial<S['WorkspaceSnapshotResult']> = {},
): S['WorkspaceSnapshotResult'] => ({
  version: '1',
  hasEffectiveEducationalRole: true,
  personalWorkspaceVisible: false,
  personalVisibilityDecision: 'Hidden',
  workspaces: [personal, school],
  ...patch,
});
describe('authoritative workspace visibility', () => {
  it('hides a personal card without removing the personal workspace or inventing a role decision', () => {
    const s = snapshot();
    expect(visibleWorkspaces(s)).toEqual([school]);
    expect(s.workspaces).toContain(personal);
    expect(visibleWorkspaces(snapshot({ hasEffectiveEducationalRole: false }))).toEqual([school]);
  });
  it('never guesses unresolved visibility and restores the card only from an explicit visible decision', () => {
    expect(
      visibleWorkspaces(
        snapshot({
          personalWorkspaceVisible: null,
          personalVisibilityDecision: 'ProductDecisionRequired',
        }),
      ),
    ).toEqual([school]);
    expect(
      visibleWorkspaces(
        snapshot({ hasEffectiveEducationalRole: false, personalWorkspaceVisible: true }),
      ),
    ).toEqual([personal, school]);
  });
  it('does not equate Active labels with entry permission or show explicitly hidden rows', () => {
    expect(canEnterWorkspace({ ...school, canEnter: undefined })).toBe(false);
    expect(canEnterWorkspace({ ...school, canEnter: false })).toBe(false);
    expect(visibleWorkspaces(snapshot({ workspaces: [{ ...school, isVisible: false }] }))).toEqual(
      [],
    );
  });
});
