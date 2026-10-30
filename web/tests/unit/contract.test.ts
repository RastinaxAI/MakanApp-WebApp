import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { operationFor, validator, contract } from '@/lib/api/contract';
import { clientOperationFor } from '@/lib/api/client-contract';
const uuid = 'd3700000-0000-0000-0000-000000000001';
describe('client-only schema contracts', () => {
  it('resolves literal collection actions before resource-ID routes', () => {
    for (const match of [operationFor, clientOperationFor]) {
      expect(match('GET', '/api/v1/personal-classes/invitations')?.path).toBe(
        '/api/v1/personal-classes/invitations',
      );
      expect(match('GET', '/api/v1/personal-classes/' + uuid)?.path).toBe(
        '/api/v1/personal-classes/{classId}',
      );
      expect(match('GET', '/api/v1/personal-classes/invented')?.path).toBe(
        '/api/v1/personal-classes/{classId}',
      );
      // The BFF still validates the GUID against this matched path schema.
    }
  });
  it('preserves and validates dynamic commercial dictionaries', () => {
    const schema = validator({ type: 'object', additionalProperties: { type: 'boolean' } });
    expect(schema.parse({ ai: true, uploads: false })).toEqual({ ai: true, uploads: false });
    expect(schema.safeParse({ ai: 'true' }).success).toBe(false);
    const quotas = validator({
      type: 'object',
      additionalProperties: { type: 'integer', nullable: true },
    });
    expect(quotas.parse({ messages: 12, storage: null })).toEqual({ messages: 12, storage: null });
    expect(quotas.safeParse({ messages: 1.5 }).success).toBe(false);
  });
  it('accepts actual non-versioned .NET account IDs without changing them', () => {
    const user = {
      id: uuid,
      phoneNumber: '+989120000101',
      isProfileComplete: true,
      firstName: 'Test',
      lastName: 'Student',
      displayName: 'Test Student',
      username: 'dev.Student',
    };
    const schema = validator({ $ref: '#/components/schemas/CurrentUserResult' });
    expect(schema.parse(user)).toEqual(user);
    for (const id of ['not-id', '../user', 'd3700000000000000000000000000001'])
      expect(schema.safeParse({ ...user, id }).success).toBe(false);
  });
  it('contains no platform routes in either the runtime or generated SDK', () => {
    expect(contract.operations.every((op) => !op.path.startsWith('/api/admin/'))).toBe(true);
    expect(readFileSync('src/generated/api/schema.d.ts', 'utf8')).not.toContain('/api/admin/');
    expect(operationFor('GET', '/api/admin/v1/me')).toBeUndefined();
    expect(operationFor('POST', '/api/v1/auth/otp/verify')).toBeUndefined();
    expect(operationFor('GET', `/api/v1/conversations/${uuid}/messages`)).toBeDefined();
    expect(operationFor('GET', '//evil.test/api')).toBeUndefined();
  });
  it('keeps the ordinary personal context and exactly four educational role keys', () => {
    const schema = validator({ $ref: '#/components/schemas/SelectWorkspaceCommand' });
    expect(
      schema.safeParse({ workspaceType: 'Personal', membershipId: null, role: null }).success,
    ).toBe(true);
    for (const role of ['Manager', 'Teacher', 'Student', 'Parent'])
      expect(
        schema.safeParse({ workspaceType: 'Organization', membershipId: uuid, role }).success,
      ).toBe(true);
    for (const role of ['PlatformOwner', 'Operations', 'Support', 'Finance'])
      expect(
        schema.safeParse({ workspaceType: 'Organization', membershipId: uuid, role }).success,
      ).toBe(false);
  });
  it('strips uncontracted identity fields without granting roles or badges', () => {
    const values = {
      firstName: 'Test',
      lastName: 'Student',
      displayName: null,
      username: 'test.Student',
    };
    expect(
      validator({ $ref: '#/components/schemas/CompleteProfileCommand' }).parse({
        ...values,
        role: 'Manager',
        isOfficial: true,
      }),
    ).toEqual(values);
  });
  it('validates timestamps and only normalizes explicitly UTC fields', () => {
    const schema = validator({
      type: 'object',
      required: ['createdAtUtc', 'scheduledAt', 'endedAtUtc'],
      properties: {
        createdAtUtc: { type: 'string', format: 'date-time' },
        scheduledAt: { type: 'string', format: 'date-time' },
        endedAtUtc: { type: 'string', format: 'date-time', nullable: true },
      },
    });
    const input = {
      createdAtUtc: '2026-10-23T09:38:09.8234431',
      scheduledAt: '2026-10-23T13:08:09+03:30',
      endedAtUtc: null,
    };
    expect(schema.parse(input)).toEqual({ ...input, createdAtUtc: input.createdAtUtc + 'Z' });
    expect(schema.safeParse({ ...input, scheduledAt: input.createdAtUtc }).success).toBe(false);
    for (const createdAtUtc of ['2026-02-30T09:38:09', '2026-10-23T25:38:09', '1405/07/26', ''])
      expect(schema.safeParse({ ...input, createdAtUtc }).success).toBe(false);
  });
});
