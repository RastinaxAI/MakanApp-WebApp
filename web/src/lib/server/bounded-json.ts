import { ApiError } from '@/lib/api/errors';
/** Bound the bytes actually read, including chunked bodies, before allocating/parsing JSON. */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new ApiError(413, { code: 'AUTH_BODY_TOO_LARGE' });
  const reader = request.body?.getReader();
  if (!reader) return null;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, { code: 'AUTH_BODY_TOO_LARGE' });
      }
      chunks.push(chunk.value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder().decode(buffer));
    } catch {
      return null;
    }
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
