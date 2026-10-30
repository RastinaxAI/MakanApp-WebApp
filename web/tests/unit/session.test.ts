import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  seal,
  unseal,
  writeSession,
  readSession,
  withSessionLock,
  validSessionId,
  type Session,
} from '@/lib/server/session';
let directory: string;
const id = '00000000-0000-4000-8000-000000000001';
const sample: Session = {
  accessToken: 'fixture-secret-a',
  refreshToken: 'fixture-secret-r',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  refreshExpiresAtUtc: '2099-02-01T00:00:00Z',
  revision: 'revision',
};
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'makan-unit-'));
  process.env.SESSION_DIRECTORY = directory;
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});
describe('Server-only session storage', () => {
  it('authenticates ciphertext and does not persist cleartext tokens', () => {
    const data = seal(sample);
    expect(data.includes(Buffer.from(sample.accessToken))).toBe(false);
    expect(unseal(data)).toEqual(sample);
    data[30] ^= 1;
    expect(() => unseal(data)).toThrow();
  });
  it('rejects cookie traversal', async () => {
    expect(validSessionId('../other')).toBe(false);
    expect(await readSession('../other')).toBeNull();
  });
  it('persists encrypted sessions and reads them', async () => {
    await writeSession(id, sample);
    expect(await readSession(id)).toEqual(sample);
  });
  it('serializes a session and releases locks after errors', async () => {
    let concurrent = 0,
      max = 0;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        withSessionLock(id, async () => {
          concurrent++;
          max = Math.max(max, concurrent);
          await new Promise((resolve) => setTimeout(resolve, 2));
          concurrent--;
        }),
      ),
    );
    expect(max).toBe(1);
    await expect(
      withSessionLock(id, async () => {
        throw new Error('expected');
      }),
    ).rejects.toThrow('expected');
    expect(await withSessionLock(id, async () => true)).toBe(true);
  });
  it('expires stale refresh sessions', async () => {
    await writeSession(id, { ...sample, refreshExpiresAtUtc: '2000-01-01T00:00:00Z' });
    expect(await readSession(id)).toBeNull();
  });
  it('rejects obsolete staged-login records', async () => {
    await writeSession(id, Object.assign({}, sample, { phase: 'obsolete-stage' }));
    expect(await readSession(id)).toBeNull();
  });
});
