import { describe, it, expect } from 'vitest';
import { readBoundedJson } from '@/lib/server/bounded-json';
const request = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://127.0.0.1/auth', { method: 'POST', body, headers });
describe('bounded authentication input', () => {
  it('reads a normal JSON request', async () =>
    expect(
      await readBoundedJson(
        request('{"phoneNumber":"09120000199"}'),
        200,
        new AbortController().signal,
      ),
    ).toEqual({ phoneNumber: '09120000199' }));
  it('rejects a declared oversized request before reading it', async () => {
    await expect(
      readBoundedJson(
        request('{}', { 'content-length': '10000000' }),
        64,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it('enforces actual bytes when Content-Length is absent or forged', async () => {
    for (const headers of [{}, { 'content-length': '1' }] as Record<string, string>[])
      await expect(
        readBoundedJson(
          request(JSON.stringify({ text: 'x'.repeat(1000) }), headers),
          64,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ status: 413 });
  });
  it('counts UTF-8 bytes instead of characters', async () => {
    const body = JSON.stringify({ text: 'آ'.repeat(40) });
    await expect(
      readBoundedJson(request(body), 70, new AbortController().signal),
    ).rejects.toMatchObject({ status: 413 });
  });
  it('returns null for malformed JSON without exposing its contents', async () =>
    expect(
      await readBoundedJson(request('{broken'), 100, new AbortController().signal),
    ).toBeNull());
  it('cancels a stalled body when the authentication deadline expires', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request('http://127.0.0.1/auth', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    const pending = readBoundedJson(req, 100, controller.signal);
    controller.abort(new DOMException('Expired', 'TimeoutError'));
    await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(cancelled).toBe(true);
  });
});
