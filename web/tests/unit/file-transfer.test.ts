import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fileTransfer } from '@/lib/api/file-transfer';
class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: {
    onprogress:
      | ((event: { loaded: number; total: number; lengthComputable: boolean }) => void)
      | null;
    onload: (() => void) | null;
  } = { onprogress: null, onload: null };
  status = 200;
  responseText = '{}';
  response: unknown;
  responseType = '';
  withCredentials = false;
  timeout = 0;
  sent = false;
  opened = false;
  onload: (() => void) | null = null;
  onprogress:
    | ((event: { loaded: number; total: number; lengthComputable: boolean }) => void)
    | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  headers: Record<string, string> = {};
  constructor() {
    FakeXHR.instances.push(this);
  }
  open() {
    this.opened = true;
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  getResponseHeader() {
    return null;
  }
  send() {
    this.sent = true;
  }
  abort() {
    this.onabort?.();
  }
}
const path = '/api/client/files?conversationId=00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  FakeXHR.instances = [];
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
});
afterEach(() => vi.unstubAllGlobals());
describe('file transport progress, cancellation and account boundary', () => {
  it('refuses traversal, other API paths and unbound file requests before issuing a request', async () => {
    for (const invalid of [
      '/api/client/files/../../auth/logout',
      '/api/client/files?conversationId=bad',
      '/api/client/files?conversationId=00000000-0000-4000-8000-000000000001&other=1',
    ]) {
      await expect(
        fileTransfer(invalid, { signal: new AbortController().signal }, { revision: 'a' }),
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(FakeXHR.instances.every((xhr) => !xhr.opened && !xhr.sent)).toBe(true);
  });
  it('reports browser upload progress separately from server processing; does not mark a file ready on progress alone', async () => {
    const onProgress = vi.fn(),
      controller = new AbortController();
    const promise = fileTransfer(
      path,
      { method: 'POST', body: new FormData(), signal: controller.signal, onProgress },
      { revision: 'revision-a', isCurrent: () => true },
    );
    const xhr = FakeXHR.instances[0];
    xhr.upload.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
    xhr.upload.onload?.();
    expect(onProgress.mock.calls.map((call) => call[0].phase)).toEqual(['uploading', 'processing']);
    expect(xhr.headers['X-Makan-Context']).toBe('revision-a');
    xhr.responseText = '{"status":"Pending"}';
    xhr.onload?.();
    await expect(promise).resolves.toEqual({ status: 'Pending' });
  });
  it('rejects an incomplete file rather than showing a complete download', async () => {
    const promise = fileTransfer(
      path,
      { binary: true, expectedBytes: 5, signal: new AbortController().signal },
      { revision: 'a' },
    );
    const xhr = FakeXHR.instances[0];
    xhr.response = new Blob(['abc']);
    xhr.onload?.();
    await expect(promise).rejects.toMatchObject({
      status: 502,
      problem: { code: 'FILE_SIZE_MISMATCH' },
    });
  });
  it('cancels without automatically replaying a file upload', async () => {
    const controller = new AbortController();
    const promise = fileTransfer(
      path,
      { method: 'POST', body: new FormData(), signal: controller.signal },
      { revision: 'a' },
    );
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeXHR.instances).toHaveLength(1);
  });
  it('does not start a transfer from a stale context', async () => {
    const promise = fileTransfer(
      path,
      { signal: new AbortController().signal },
      { revision: 'a', isCurrent: () => false },
    );
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeXHR.instances[0].sent).toBe(false);
  });
  it('discards an old 401 while its blob body is decoding, without expiring the new account', async () => {
    let current = true,
      release!: (value: string) => void;
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const promise = fileTransfer(
      path,
      { binary: true, signal: new AbortController().signal },
      { revision: 'a', isCurrent: () => current },
    );
    const xhr = FakeXHR.instances[0];
    xhr.status = 401;
    xhr.response = {
      text: () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    };
    xhr.onload?.();
    current = false;
    release('{"status":401}');
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it('does not send requests to another origin', async () => {
    await expect(
      fileTransfer(
        'https://other.invalid/files',
        { signal: new AbortController().signal },
        { revision: 'a' },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(FakeXHR.instances[0].sent).toBe(false);
  });
});
