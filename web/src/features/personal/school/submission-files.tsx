'use client';
import { useAcademicScope } from './academic-scope';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { ErrorState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { ApiError } from '@/lib/api/errors';
import { submissionFileAccept, submissionFileError } from '@/lib/submission-file';
import { Download, FileImage, FileText, Paperclip, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePersonal } from '../provider';
import { Card } from './shared';
import s from './school.module.css';
type S = components['schemas'];
export function SubmissionFiles({
  value,
  editable = false,
  disabled = false,
  onSaved,
  onBusy,
}: {
  value: S['SubmissionAttemptResult'];
  editable?: boolean;
  disabled?: boolean;
  onSaved?: (value: S['SubmissionAttemptResult']) => Promise<void>;
  onBusy?: (busy: boolean) => void;
}) {
  const { call, transfer } = usePersonal();
  const scope = useAcademicScope();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [notice, setNotice] = useState(''),
    [progress, setProgress] = useState<TransferProgress>(),
    [pending, setPending] = useState<S['FileAssetResult']>();
  const abort = useRef<AbortController | null>(null),
    mutex = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);
  useUnsavedChanges(busy || !!pending);
  useEffect(() => {
    onBusy?.(busy || !!pending);
    return () => onBusy?.(false);
  }, [busy, !!pending, onBusy]);
  const base = '/api/v1/academic/submission-attempts/' + value.id;
  async function latest(signal: AbortSignal) {
    const v = await call<S['SubmissionAttemptResult']>(base, { signal });
    if (
      v.id !== value.id ||
      v.assignmentId !== value.assignmentId ||
      !scope.matches(v) ||
      !v.contentVisible
    )
      throw new ApiError(403);
    return v;
  }
  async function change(file?: File, remove?: string) {
    if (mutex.current || disabled) return;
    if (file) {
      const invalid = submissionFileError(file);
      if (invalid) {
        setNotice(invalid);
        return;
      }
    }
    mutex.current = true;
    setBusy(true);
    setError(undefined);
    setNotice('');
    setProgress(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      let current = await latest(controller.signal);
      if (current.status !== 'Draft') throw new ApiError(409, { code: 'SUBMISSION_NOT_DRAFT' });
      if (current.rowVersion !== value.rowVersion)
        throw new ApiError(409, { code: 'SUBMISSION_VERSION_CONFLICT' });
      let result: S['SubmissionAttemptResult'];
      if (remove) {
        result = await call(
          base +
            '/attachments/' +
            remove +
            '?' +
            new URLSearchParams({ expectedRowVersion: current.rowVersion }),
          { method: 'DELETE', signal: controller.signal },
        );
      } else {
        let asset = pending;
        if (file) {
          const form = new FormData();
          form.append('File', file);
          if (scope.personal) form.append('PersonalClassId', scope.personal.classId);
          asset = await transfer<S['FileAssetResult']>(
            '/api/client/submission-files?attemptId=' +
              value.id +
              (scope.personal ? '&audience=learner' : ''),
            { method: 'POST', body: form, signal: controller.signal, onProgress: setProgress },
          );
          setPending(asset);
        } else if (asset) {
          asset = await transfer<S['FileAssetResult']>(
            `/api/client/submission-files/${asset.id}?attemptId=${value.id}${scope.personal ? '&audience=learner' : ''}`,
            { signal: controller.signal },
          );
          setPending(asset);
        }
        if (!asset) return;
        if (asset.status !== 'Ready') {
          setNotice(
            asset.status === 'Pending' ? uiText.text_9778ed17625c : uiText.text_e6375898a5b5,
          );
          return;
        }
        current = await latest(controller.signal);
        if (current.attachments.some((a) => a.fileAssetId === asset!.id)) {
          await onSaved?.(current);
          setPending(undefined);
          return;
        }
        if (current.rowVersion !== value.rowVersion)
          throw new ApiError(409, { code: 'SUBMISSION_VERSION_CONFLICT' });
        try {
          result = await call(base + '/attachments', {
            method: 'POST',
            body: JSON.stringify({ fileAssetId: asset.id, expectedRowVersion: current.rowVersion }),
            signal: controller.signal,
          });
        } catch (problem) {
          if (controller.signal.aborted) throw problem;
          const reconciled = await latest(controller.signal);
          if (!reconciled.attachments.some((a) => a.fileAssetId === asset!.id)) throw problem;
          result = reconciled;
        }
      }
      if (
        result.id !== value.id ||
        result.assignmentId !== value.assignmentId ||
        !result.contentVisible
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      await onSaved?.(result);
      setPending(undefined);
    } catch (problem) {
      if (!(problem instanceof Error && problem.name === 'AbortError')) setError(problem);
      else setNotice(uiText.text_f1b5427c160c);
    } finally {
      mutex.current = false;
      setBusy(false);
    }
  }
  async function download(file: S['SubmissionAttachmentResult']) {
    if (mutex.current) return;
    mutex.current = true;
    setBusy(true);
    setError(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const blob = await transfer<Blob>(
        `/api/client/submission-files/${file.fileAssetId}/content?attemptId=${value.id}${scope.personal ? '&audience=learner' : ''}`,
        {
          binary: true,
          expectedBytes: file.sizeBytes,
          signal: controller.signal,
          onProgress: setProgress,
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalFileName;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (problem) {
      if (!(problem instanceof Error && problem.name === 'AbortError')) setError(problem);
    } finally {
      mutex.current = false;
      setBusy(false);
    }
  }
  return (
    <Card title={uiText.text_802918533a64}>
      {editable && (
        <label className={s.answerFilePicker}>
          <Paperclip size={19} />
          <span>{uiText.text_bd9a4d172538}</span>
          <input
            aria-label={uiText.text_35cb5e51737d}
            type="file"
            accept={submissionFileAccept}
            disabled={disabled || busy || !!pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void change(file);
            }}
          />
        </label>
      )}
      {editable && disabled && <p className={s.hint}>{uiText.text_ac916da78819}</p>}
      {!value.attachments.length && <p className={s.hint}>{uiText.text_4748e6b9891c}</p>}
      {value.attachments.map((file) => {
        const Icon = file.contentType === 'application/pdf' ? FileText : FileImage;
        return (
          <div className={s.answerFileRow} key={file.fileAssetId}>
            <Icon size={22} />
            <span>
              <strong>{file.originalFileName}</strong>
              <small>
                {(file.sizeBytes < 1024 ? file.sizeBytes : file.sizeBytes / 1024).toLocaleString(
                  'fa-IR',
                  { maximumFractionDigits: 1 },
                )}{' '}
                {file.sizeBytes < 1024 ? uiText.text_1126b74c039f : uiText.text_324fedf3e688}
                {uiText.text_78887da22764}{' '}
                {file.fileStatus === 'Ready'
                  ? uiText.text_376e9c9561e2
                  : file.fileStatus === 'Pending'
                    ? uiText.text_f71cd91dad22
                    : uiText.text_cf473a776359}
              </small>
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={uiText.text_1e229eb338a6 + file.originalFileName}
              disabled={busy || file.fileStatus !== 'Ready'}
              onClick={() => void download(file)}
            >
              <Download size={18} />
            </Button>
            {editable && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={uiText.text_454d4aebcf48 + file.originalFileName}
                disabled={disabled || busy}
                onClick={() => void change(undefined, file.fileAssetId)}
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        );
      })}
      {pending && (
        <div>
          <p>{pending.originalFileName}</p>
          <Button variant="outline" disabled={busy || disabled} onClick={() => void change()}>
            {pending.status === 'Ready' ? uiText.text_6bbd07a24946 : uiText.text_64197e65a1c9}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setPending(undefined)}>
            {uiText.text_f03f62ba4a5a}
          </Button>
        </div>
      )}
      {busy && (
        <div role="status">
          <p>
            {progress?.phase === 'downloading'
              ? uiText.text_1cf79c5c02d8
              : uiText.text_07aba39257cf}
          </p>
          <progress
            aria-label={uiText.text_9e8687e29590}
            max={progress?.total ?? undefined}
            value={progress?.loaded}
          />
          <Button variant="ghost" onClick={() => abort.current?.abort()}>
            {uiText.text_a6419190d700}
          </Button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!!error && <ErrorState error={error} />}
    </Card>
  );
}
