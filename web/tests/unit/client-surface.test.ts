import { describe, expect, it } from 'vitest';
import { isClientOperation, contextSignature } from '@/lib/client-surface';
import { contract } from '@/lib/api/contract';
describe('bounded personal BFF surface', () => {
  it('never admits administration, authentication forwarding or undocumented operations', () => {
    for (const op of contract.operations.filter(
      (op) => op.path.startsWith('/api/admin/') || op.path.startsWith('/api/v1/auth/'),
    ))
      expect(isClientOperation(op.method, op.path)).toBe(false);
    expect(isClientOperation('GET', '/api/v1/commerce/personal/subscription')).toBe(true);
    expect(isClientOperation('POST', '/api/v1/commerce/personal/orders')).toBe(true);
    expect(isClientOperation('POST', '/api/v1/commerce/invented')).toBe(false);
    expect(isClientOperation('PATCH', '/api/v1/me/profile')).toBe(true);
    expect(isClientOperation('POST', '/api/v1/conversations/direct')).toBe(true);
    expect(isClientOperation('DELETE', '/api/v1/me')).toBe(false);
  });
  it('uses each context relation, selected role and selected child in the signature', () => {
    const base = {
      workspaceType: 'Personal',
      organizationId: null,
      membershipId: null,
      activeRole: null,
      subjectOrganizationPersonId: null,
    };
    const keys = Object.keys(base) as (keyof typeof base)[];
    for (const key of keys)
      expect(contextSignature({ ...base, [key]: 'different' })).not.toBe(contextSignature(base));
  });
});
