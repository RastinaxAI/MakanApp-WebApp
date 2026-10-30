import { assertBinaryContent } from './binary-response';
import { ApiError, parseProblem } from './errors';
import type { ContextGuard } from './client';
export type TransferProgress = {
  loaded: number;
  total: number | null;
  phase: 'uploading' | 'processing' | 'downloading';
};
export type TransferOptions = {
  method?: 'GET' | 'POST';
  body?: FormData;
  binary?: boolean;
  expectedBytes?: number;
  signal: AbortSignal;
  onProgress?: (progress: TransferProgress) => void;
};
export function fileTransfer<T>(
  path: string,
  options: TransferOptions,
  guard: ContextGuard,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const xhr = new XMLHttpRequest();
    const stale = () => options.signal.aborted || guard.isCurrent?.() === false;
    const abortError = () =>
      new DOMException('File transfer canceled or belongs to an earlier context.', 'AbortError');
    function finish(error: unknown, result?: T) {
      if (settled) return;
      settled = true;
      options.signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(result as T);
    }
    function abort() {
      xhr.abort();
      finish(abortError());
    }
    if (stale()) {
      finish(abortError());
      return;
    }
    const guid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    if (
      !new RegExp(
        '^/api/client/files(?:/' + guid + '(?:/content)?)?\\?conversationId=' + guid + '$',
        'i',
      ).test(path) &&
      !new RegExp('^/api/client/profile-media(?:/' + guid + '(?:/metadata)?)?$', 'i').test(path) &&
      !new RegExp('^/api/client/school-files(?:/' + guid + ')?\\?classId=' + guid + '$', 'i').test(
        path,
      ) &&
      !new RegExp(
        '^/api/client/school-files/' + guid + '/content\\?lessonId=' + guid + '$',
        'i',
      ).test(path) &&
      !new RegExp(
        '^/api/client/submission-files(?:/' + guid + '(?:/content)?)?\\?attemptId=' + guid + '$',
        'i',
      ).test(path) &&
      !new RegExp(
        '^/api/client/exam-files(?:/' +
          guid +
          '(?:/content)?)?\\?attemptId=' +
          guid +
          '&questionId=' +
          guid +
          '$',
        'i',
      ).test(path)
    ) {
      finish(new ApiError(400));
      return;
    }
    xhr.open(options.method ?? 'GET', path);
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.responseType = options.binary ? 'blob' : 'text';
    xhr.setRequestHeader('X-Makan-Context', guard.revision);
    options.signal.addEventListener('abort', abort, { once: true });
    const progress = (phase: TransferProgress['phase'], loaded: number, total: number | null) => {
      if (stale()) {
        abort();
        return;
      }
      options.onProgress?.({ phase, loaded, total });
    };
    xhr.upload.onprogress = (event) =>
      progress('uploading', event.loaded, event.lengthComputable ? event.total : null);
    xhr.upload.onload = () => progress('processing', 0, null);
    xhr.onprogress = (event) => {
      if (options.binary)
        progress(
          'downloading',
          event.loaded,
          event.lengthComputable ? event.total : (options.expectedBytes ?? null),
        );
    };
    xhr.onerror = () =>
      finish(stale() ? abortError() : new ApiError(503, { code: 'FILE_TRANSFER_UNAVAILABLE' }));
    xhr.ontimeout = () => finish(stale() ? abortError() : new ApiError(504));
    xhr.onabort = () => finish(abortError());
    xhr.onload = () => {
      void (async () => {
        if (stale()) throw abortError();
        if (xhr.status < 200 || xhr.status >= 300) {
          let body: unknown;
          try {
            body = JSON.parse(
              options.binary ? await (xhr.response as Blob).text() : xhr.responseText,
            );
          } catch {}
          if (stale()) throw abortError();
          const problem = parseProblem(body, xhr.status, xhr.getResponseHeader('Retry-After'));
          if (problem.code === 'CONTEXT_CHANGED') guard.onContextChanged?.();
          if (xhr.status === 401 && typeof window !== 'undefined')
            window.dispatchEvent(new Event('makan:expired'));
          throw new ApiError(xhr.status, problem);
        }
        if (options.binary) assertBinaryContent({ get: (name) => xhr.getResponseHeader(name) });
        const result = options.binary ? xhr.response : JSON.parse(xhr.responseText);
        if (stale()) throw abortError();
        if (
          options.binary &&
          options.expectedBytes !== undefined &&
          (result as Blob).size !== options.expectedBytes
        )
          throw new ApiError(502, { code: 'FILE_SIZE_MISMATCH' });
        finish(null, result as T);
      })().catch((error) =>
        finish(
          error instanceof SyntaxError ? new ApiError(502, { code: 'CONTRACT_MISMATCH' }) : error,
        ),
      );
    };
    try {
      if (stale()) {
        abort();
        return;
      }
      xhr.send(options.body ?? null);
    } catch (error) {
      finish(error);
    }
  });
}
