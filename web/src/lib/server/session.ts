import 'server-only';
import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { serverConfig } from './config';

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  refreshExpiresAtUtc: string;
  revision: string;
  userId?: string;
  contextSignature?: string;
  messagingConnections?: { hash: string; revision: string; createdAt: number }[];
};
export function validSessionId(id: string | undefined): id is string {
  return !!id && /^[0-9a-f-]{36}$/.test(id);
}
export function seal(value: Session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', serverConfig().key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
export function unseal(data: Buffer): Session {
  const decipher = createDecipheriv('aes-256-gcm', serverConfig().key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'),
  ) as Session;
}
export async function readSession(id: string | undefined): Promise<Session | null> {
  if (!validSessionId(id)) return null;
  try {
    const value = unseal(await readFile(path.join(serverConfig().sessionDirectory, id)));
    if (Date.parse(value.refreshExpiresAtUtc) <= Date.now() || 'phase' in value) {
      await removeSession(id);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
export async function writeSession(id: string, value: Session) {
  if (!validSessionId(id)) throw new Error('Invalid session');
  const dir = serverConfig().sessionDirectory;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const target = path.join(dir, id);
  const temp = target + '.' + randomUUID() + '.tmp';
  await writeFile(temp, seal(value), { mode: 0o600 });
  await rename(temp, target);
}
export async function removeSession(id: string) {
  if (validSessionId(id))
    await unlink(path.join(serverConfig().sessionDirectory, id)).catch(() => {});
}
export const cookieOptions = () => ({
  httpOnly: true,
  secure: serverConfig().secure,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
});

export { withSessionLock, withSessionRead } from './session-lock';
