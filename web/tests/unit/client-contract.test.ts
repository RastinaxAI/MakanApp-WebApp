import { describe, expect, it } from 'vitest';
import { clientContract, clientOperationFor, clientValidator } from '@/lib/api/client-contract';
import { operationFor, validator } from '@/lib/api/contract';
import { isClientOperation } from '@/lib/client-surface';
describe('client-only generated runtime', () => {
  it('includes each bounded operation in both registries without a platform-management surface', () => {
    for (const op of clientContract.operations)
      expect(isClientOperation(op.method, op.path)).toBe(true);
    expect(clientOperationFor('GET', '/api/v1/me/messaging-status')).toBeDefined();
    expect(
      clientOperationFor(
        'GET',
        '/api/v1/conversations/00000000-0000-4000-8000-000000000001/messages',
      ),
    ).toBeDefined();
    expect(operationFor('GET', '/api/v1/me/messaging-status')).toBeDefined();
    expect(clientOperationFor('GET', '/api/admin/v1/users')).toBeUndefined();
  });
  it('validates status DTOs with actual required enums instead of falling back to unknown', () => {
    const valid = {
      verificationStatus: 'Unverified',
      effectiveAgeCategory: 'Unknown',
      allowedActions: [],
      nextAction: 'VerificationRequired',
      version: 'v1',
    };
    const schema = clientValidator({ $ref: '#/components/schemas/MessagingStatusResult' });
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ ...valid, nextAction: 'AgeIs18' }).success).toBe(false);
  });
  it('keeps lazy schema caches separate across registries', () => {
    const input = { $ref: '#/components/schemas/Shared' };
    const text = validator(input, false, { Shared: { type: 'string' } }),
      numeric = validator(input, false, { Shared: { type: 'number' } });
    expect(text.safeParse('value').success).toBe(true);
    expect(numeric.safeParse('value').success).toBe(false);
    expect(numeric.safeParse(1).success).toBe(true);
  });
});
