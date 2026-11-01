import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function inviteLinkState(link: S['InviteLinkResult'], now = Date.now()) {
  if (link.revokedAtUtc) return 'revoked';
  if (!Number.isFinite(Date.parse(link.expiresAtUtc)) || Date.parse(link.expiresAtUtc) <= now)
    return 'expired';
  if (link.usedCount >= link.maximumUses) return 'exhausted';
  return 'active';
}
export function redemptionState(value: S['InviteLinkRedemptionResult']) {
  if (value.alreadyMember) return 'member';
  if (!value.joinRequest || value.joinRequest.status === 'Approved') return 'joined';
  return value.joinRequest.status === 'Pending' ? 'pending' : 'denied';
}
