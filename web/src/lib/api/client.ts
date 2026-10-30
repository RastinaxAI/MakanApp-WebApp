import { ApiError, parseProblem } from './errors';
export type ContextGuard = {
  revision: string;
  onContextChanged?: () => void;
  isCurrent?: () => boolean;
};
export async function request<T>(
  path: string,
  init: RequestInit = {},
  guard?: ContextGuard,
): Promise<T> {
  const ensureCurrent = () => {
    if (guard?.isCurrent && !guard.isCurrent())
      throw new DOMException('The request belongs to an earlier account or context.', 'AbortError');
  };
  ensureCurrent();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(guard ? { 'X-Makan-Context': guard.revision } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    ensureCurrent();
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(503, { code: 'NETWORK_ERROR' });
  }
  ensureCurrent();
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {}
    ensureCurrent();
    const p = parseProblem(body, response.status, response.headers.get('Retry-After'));
    if (p.code === 'CONTEXT_CHANGED') guard?.onContextChanged?.();
    if (response.status === 401 && typeof window !== 'undefined')
      window.dispatchEvent(new Event('makan:expired'));
    throw new ApiError(response.status, p);
  }
  if (response.status === 204) return undefined as T;
  let result: unknown;
  try {
    result = response.headers.get('Content-Type')?.includes('octet-stream')
      ? await response.blob()
      : await response.json();
  } catch (error) {
    ensureCurrent();
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  }
  ensureCurrent();
  return result as T;
}
