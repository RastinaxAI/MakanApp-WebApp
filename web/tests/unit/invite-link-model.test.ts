import { describe, it, expect } from 'vitest';
import { inviteLinkState, redemptionState } from '@/features/personal/messaging/invite-link-model';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
const link = {
  expiresAtUtc: '2026-11-02T00:00:00Z',
  maximumUses: 2,
  usedCount: 0,
  revokedAtUtc: null,
} as S['InviteLinkResult'];
describe('invitation state reflects the server receipt', () => {
  it('distinguishes active, expired, exhausted and revoked links', () => {
    const now = Date.parse('2026-11-01T00:00:00Z');
    expect(inviteLinkState(link, now)).toBe('active');
    expect(inviteLinkState({ ...link, expiresAtUtc: 'bad' }, now)).toBe('expired');
    expect(inviteLinkState(link, Date.parse('2026-11-02T00:00:00Z'))).toBe('expired');
    expect(inviteLinkState({ ...link, usedCount: 2 }, now)).toBe('exhausted');
    expect(inviteLinkState({ ...link, revokedAtUtc: '2026-11-01T00:00:00Z' }, now)).toBe('revoked');
  });
  it.each(['Rejected', 'Cancelled', 'Expired'] as const)(
    'never treats %s as membership success',
    (status) => {
      expect(
        redemptionState({
          alreadyMember: false,
          joinRequest: { status },
        } as S['InviteLinkRedemptionResult']),
      ).toBe('denied');
    },
  );
  it('separates pending approval, direct membership and existing membership', () => {
    expect(
      redemptionState({
        alreadyMember: false,
        joinRequest: { status: 'Pending' },
      } as S['InviteLinkRedemptionResult']),
    ).toBe('pending');
    expect(
      redemptionState({
        alreadyMember: false,
        joinRequest: null,
      } as S['InviteLinkRedemptionResult']),
    ).toBe('joined');
    expect(
      redemptionState({
        alreadyMember: true,
        joinRequest: null,
      } as S['InviteLinkRedemptionResult']),
    ).toBe('member');
  });
});
