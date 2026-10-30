import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validator } from '@/lib/api/contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { authenticatedFetch } from './backend';
import { readSession, writeSession, withSessionRead } from './session';
import { isSessionRead, ExclusiveSessionRequired } from './session-lock';
import type { components } from '@/generated/api/schema';
import { clientCookieName } from './cookie-name';
export const CLIENT_COOKIE = clientCookieName(process.env.CLIENT_COOKIE_NAME);
export async function clientSessionId() {
  return (await cookies()).get(CLIENT_COOKIE)?.value;
}
export type ClientState = {
  user: components['schemas']['CurrentUserResult'];
  context: components['schemas']['AccessContext'];
  revision: string;
};
// Share only overlapping reads, never a cached authorization result across requests.
const pendingReads = new Map<string, Promise<ClientState | null>>();
export function getClientState(id: string): Promise<ClientState | null> {
  if (!isSessionRead(id)) return loadClientState(id);
  const pending = pendingReads.get(id);
  if (pending) return pending;
  const next = loadClientState(id).finally(() => {
    if (pendingReads.get(id) === next) pendingReads.delete(id);
  });
  pendingReads.set(id, next);
  return next;
}
// Caller holds shared read access or the exclusive session lock. Mutations remain exclusive.
async function loadClientState(id: string): Promise<ClientState | null> {
  const session = await readSession(id);
  if (!session) return null;
  async function read<T>(path: string, schema: string): Promise<T> {
    const latest = await readSession(id);
    if (!latest) throw new ApiError(401);
    const result = await authenticatedFetch(id, latest, path);
    const body = await result.response.json().catch(() => null);
    if (!result.response.ok)
      throw new ApiError(result.response.status, parseProblem(body, result.response.status));
    const parsed = validator({ $ref: `#/components/schemas/${schema}` }).safeParse(body);
    if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    return parsed.data as T;
  }
  const readUser = () =>
    read<components['schemas']['CurrentUserResult']>('/api/v1/me', 'CurrentUserResult');
  const readContext = () =>
    read<components['schemas']['AccessContext']>('/api/v1/workspaces/current', 'AccessContext');
  // Shared readers cannot rotate credentials. A refresh upgrades to the exclusive
  // path; that path keeps credential-dependent reads sequential.
  const [user, context] = isSessionRead(id)
    ? await Promise.all([readUser(), readContext()])
    : [await readUser(), await readContext()];
  if (!session.userId || user.id.toLowerCase() !== session.userId.toLowerCase())
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  if (context.userId.toLowerCase() !== user.id.toLowerCase())
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  const signature = contextSignature(context);
  const latest = await readSession(id);
  if (!latest) return null;
  const changed = !!latest.contextSignature && latest.contextSignature !== signature;
  const revision = changed ? crypto.randomUUID() : latest.revision;
  if (latest.contextSignature !== signature) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    await writeSession(id, { ...latest, contextSignature: signature, revision });
  }
  return { user, context, revision };
}
export async function requireClientPage() {
  const id = await clientSessionId();
  const valid = id ? await withSessionRead(id, () => readSession(id)) : null;
  if (!valid) redirect('/enter');
}
