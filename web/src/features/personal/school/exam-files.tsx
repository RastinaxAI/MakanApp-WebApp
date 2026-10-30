'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { examFileIssue } from '@/lib/exam-attachment';
import { formatFileSize } from '../messaging/media-model';
import { usePersonal } from '../provider';
import s from './exam-files.module.css';
type S = components['schemas'];
export function ExamFileDownload({
  attemptId,
  questionId,
  file,
}: {
  attemptId: string;
  questionId: string;
  file: S['AcademicAnswerAttachmentDto'];
}) {
  const { transfer } = usePersonal();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <div className={s.file}>
      <Paperclip size={19} />
      <div>
        <strong dir="auto">{file.originalFileName}</strong>
        <small>{formatFileSize(file.sizeBytes)}</small>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy || file.fileStatus !== 'Ready' || !file.canDownload}
        onClick={async () => {
          if (controller.current) return;
          const active = new AbortController();
          controller.current = active;
          setBusy(true);
          setError(undefined);
          try {
            const blob = await transfer<Blob>(
              `/api/client/exam-files/${file.fileAssetId}/content?attemptId=${attemptId}&questionId=${questionId}`,
              { signal: active.signal, binary: true, expectedBytes: file.sizeBytes },
            );
            const url = URL.createObjectURL(blob),
              link = document.createElement('a');
            link.href = url;
            link.download = file.originalFileName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (e) {
            if (!(e instanceof Error && e.name === 'AbortError')) setError(e);
          } finally {
            controller.current = null;
            setBusy(false);
          }
        }}
      >
        <Download size={17} />
        {busy ? 'در حال دریافت…' : 'دریافت ' + file.originalFileName}
      </Button>
      {busy && (
        <Button type="button" variant="ghost" onClick={() => controller.current?.abort()}>
          لغو دریافت
        </Button>
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
type Mutation = { path: string; method: string; body?: S['AttachExamAnswerFileCommand'] };
export function ExamAnswerFiles({
  attemptId,
  questionId,
  policy,
  files,
  revision,
  lease,
  disabled,
  onSaved,
  onPending,
}: {
  attemptId: string;
  questionId: string;
  policy: S['ExamQuestionAttachmentPolicyDto'];
  files: S['AcademicAnswerAttachmentDto'][];
  revision: number | null;
  lease?: S['ExamWriteLeaseDto'];
  disabled: boolean;
  onSaved: () => Promise<void>;
  onPending: (value: boolean) => void;
}) {
  const { call, transfer } = usePersonal();
  const input = useRef<HTMLInputElement>(null),
    lock = useRef(false),
    abort = useRef<AbortController | null>(null),
    action = useRef<Mutation | undefined>(undefined);
  const [pending, setPending] = useState<S['FileAssetResult']>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [issue, setIssue] = useState(''),
    [progress, setProgress] = useState<TransferProgress>(),
    [conflict, setConflict] = useState(false),
    [rejected, setRejected] = useState(false),
    [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    onPending(busy || !!pending || uncertain);
  }, [busy, pending, uncertain, onPending]);
  useEffect(() => () => abort.current?.abort(), []);
  const suffix = `?attemptId=${attemptId}&questionId=${questionId}`,
    endpoint = `/api/v1/academic/exam-attempts/${attemptId}/answers/${questionId}/attachments`;
  function failed(error: unknown) {
    setError(error);
    setConflict(error instanceof ApiError && error.status === 409);
    if (error instanceof ApiError && [400, 403, 404, 410, 415, 422].includes(error.status)) {
      action.current = undefined;
      setUncertain(false);
      setRejected(true);
    }
  }
  async function mutate(command: Mutation) {
    action.current = command;
    setUncertain(true);
    const receipt = await call<S['ExamAnswerReceiptDto']>(command.path, {
      method: command.method,
      ...(command.body ? { body: JSON.stringify(command.body) } : {}),
    });
    if (receipt.status !== 'Accepted') throw new ApiError(409);
    await onSaved();
    action.current = undefined;
    setPending(undefined);
    setUncertain(false);
    setConflict(false);
  }
  async function upload(file?: File) {
    if (lock.current || disabled || !lease) return;
    if (file) {
      const message = examFileIssue(policy, { type: file.type, size: file.size }, files);
      if (message) {
        setIssue(message);
        return;
      }
      setRejected(false);
    }
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setIssue('');
    setProgress(undefined);
    const active = new AbortController();
    abort.current = active;
    try {
      let asset = pending;
      if (file) {
        const form = new FormData();
        form.append('File', file);
        asset = await transfer<S['FileAssetResult']>('/api/client/exam-files' + suffix, {
          method: 'POST',
          body: form,
          signal: active.signal,
          onProgress: setProgress,
        });
        setPending(asset);
      } else if (asset?.status === 'Pending') {
        asset = await transfer<S['FileAssetResult']>(
          `/api/client/exam-files/${asset.id}${suffix}`,
          { signal: active.signal },
        );
        setPending(asset);
      }
      if (asset?.status === 'Ready')
        await mutate(
          action.current ?? {
            path: endpoint,
            method: 'POST',
            body: {
              fileAssetId: asset.id,
              clientOperationId: crypto.randomUUID(),
              writeLeaseVersion: lease.writeLeaseVersion,
              expectedRevisionNumber: revision,
            },
          },
        );
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        failed(e);
      }
    } finally {
      lock.current = false;
      abort.current = null;
      setBusy(false);
    }
  }
  if (!policy?.attachmentsAllowed && !files.length) return null;
  return (
    <section className={s.panel} aria-label="پیوست‌های پاسخ سؤال">
      <h3>پیوست‌های پاسخ</h3>
      {policy?.attachmentsAllowed && (
        <>
          <p>
            {policy.textRequired
              ? 'پاسخ متنی الزامی است؛ فایل نیز می‌توانید اضافه کنید.'
              : 'می‌توانید پاسخ را به‌صورت متن، فایل یا هر دو ارسال کنید.'}
            {policy.maximumCount !== null
              ? ' · حداکثر ' + policy.maximumCount.toLocaleString('fa-IR') + ' فایل'
              : ''}
            {policy.maximumTotalBytes !== null
              ? ' · مجموع ' + formatFileSize(policy.maximumTotalBytes)
              : ''}
          </p>
          <input
            hidden
            ref={input}
            type="file"
            aria-label="انتخاب پیوست پاسخ آزمون"
            accept={policy.allowedContentTypes.join(',')}
            disabled={disabled || busy || !!pending || uncertain}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy || !!pending || uncertain}
            onClick={() => input.current?.click()}
          >
            <Upload size={18} />
            افزودن فایل پاسخ
          </Button>
        </>
      )}
      {files.map((file) => (
        <div key={file.fileAssetId}>
          <ExamFileDownload attemptId={attemptId} questionId={questionId} file={file} />
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || busy || !!pending || uncertain}
            onClick={async () => {
              if (lock.current || !lease) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              const query = new URLSearchParams({
                ClientOperationId: crypto.randomUUID(),
                WriteLeaseVersion: String(lease.writeLeaseVersion),
                ...(revision !== null ? { ExpectedRevisionNumber: String(revision) } : {}),
              });
              try {
                await mutate({
                  path: `${endpoint}/${file.fileAssetId}?${query}`,
                  method: 'DELETE',
                });
              } catch (e) {
                failed(e);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            حذف پیوست {file.originalFileName}
          </Button>
        </div>
      ))}
      {busy && (
        <div role="status">
          <p>در حال انتقال یا ثبت پیوست…</p>
          <progress
            aria-label="پیشرفت پیوست آزمون"
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
          />
          {!action.current && (
            <Button type="button" variant="ghost" onClick={() => abort.current?.abort()}>
              لغو بارگذاری
            </Button>
          )}
        </div>
      )}
      {pending && (
        <div className={s.pending}>
          <strong dir="auto">{pending.originalFileName}</strong>
          <p>
            {rejected
              ? 'این پیوست پذیرفته نشد؛ آن را کنار بگذارید و فایل مناسب انتخاب کنید.'
              : pending.status === 'Pending'
                ? 'فایل در حال بررسی است؛ هنوز به پاسخ وصل نشده.'
                : pending.status === 'Ready'
                  ? 'ثبت اتصال فایل به پاسخ هنوز تأیید نشده است.'
                  : 'فایل قابل استفاده نیست.'}
          </p>
          {!conflict && !rejected && (
            <Button
              type="button"
              disabled={disabled || busy || !['Ready', 'Pending'].includes(pending.status)}
              onClick={() => void upload()}
            >
              {pending.status === 'Pending' ? 'بررسی وضعیت فایل' : 'بررسی و ثبت همین پیوست'}
            </Button>
          )}
          {!uncertain && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setPending(undefined)}
            >
              کنار گذاشتن فایل
            </Button>
          )}
        </div>
      )}
      {conflict && (
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSaved();
              action.current = undefined;
              setUncertain(false);
              setConflict(false);
              setError(undefined);
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          دریافت نسخهٔ جدید پاسخ
        </Button>
      )}
      {uncertain && !pending && !conflict && action.current && (
        <Button
          type="button"
          disabled={disabled || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await mutate(action.current!);
            } catch (e) {
              failed(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          بررسی دوبارهٔ همین تغییر پیوست
        </Button>
      )}
      {!!issue && <p role="alert">{issue}</p>}
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
