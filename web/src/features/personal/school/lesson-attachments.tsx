'use client';
import * as uiText from '@/content/fa';
import { useId, useRef } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  FileImage,
  CheckCircle2,
  Clock3,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { formatFileSize } from '../messaging/media-model';
import s from './lesson-attachments.module.css';
type S = components['schemas'];
export type EditorAttachment = {
  id: string;
  name: string;
  sizeBytes?: number;
  contentType?: string;
  status?: S['FileAssetStatus'];
};
export function LessonAttachmentEditor({
  assets,
  pending,
  uploading,
  disabled,
  progress,
  error,
  onPick,
  onRemove,
  onCancel,
  onCheck,
  onDismiss,
}: {
  assets: EditorAttachment[];
  pending?: S['FileAssetResult'];
  uploading: boolean;
  disabled: boolean;
  progress?: TransferProgress;
  error?: unknown;
  onPick: (file: File) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onCheck: () => void;
  onDismiss: () => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    id = useId();
  const percent = progress?.total
    ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
    : null;
  return (
    <section className={s.panel} aria-label={uiText.text_968ea718e159} aria-busy={uploading}>
      <header className={s.heading}>
        <span className={s.icon}>
          <Paperclip size={22} />
        </span>
        <div>
          <h2>{uiText.text_968ea718e159}</h2>
          <p>{uiText.text_35b7da5aa84f}</p>
        </div>
        <span className={s.count}>
          {assets.length.toLocaleString('fa-IR')}
          {uiText.text_8db870221ba1}
        </span>
      </header>
      <div className={s.picker}>
        <Upload size={27} />
        <div>
          <strong>{uiText.text_42c335b87f14}</strong>
          <p id={id}>{uiText.text_1efc73ab12b4}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading || !!pending}
          onClick={() => input.current?.click()}
        >
          <Upload size={18} />
          {uiText.text_eef3e6a8a691}
        </Button>
        <input
          ref={input}
          type="file"
          className={s.fileInput}
          tabIndex={-1}
          disabled={disabled || uploading || !!pending}
          aria-label={uiText.text_ab79179420ee}
          aria-describedby={id}
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = '';
            if (file) onPick(file);
          }}
        />
      </div>
      {!!assets.length && (
        <ul className={s.list}>
          {assets.map((asset) => (
            <li key={asset.id}>
              <span className={s.fileIcon}>
                {asset.contentType?.startsWith('image/') ? (
                  <FileImage size={22} />
                ) : (
                  <FileText size={22} />
                )}
              </span>
              <div>
                <strong dir="auto">{asset.name}</strong>
                <small>
                  {asset.sizeBytes === undefined
                    ? uiText.text_fbfd46e53247
                    : formatFileSize(asset.sizeBytes)}
                  {asset.status === 'Ready' ? uiText.text_1bf987f717ef : ''}
                </small>
              </div>
              {asset.status === 'Ready' && <CheckCircle2 size={18} className={s.ready} />}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || uploading}
                aria-label={uiText.text_d3f1f47d3218 + asset.name}
                onClick={() => onRemove(asset.id)}
              >
                <Trash2 size={18} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {uploading && (
        <div className={s.progress} role="status">
          <div>
            <strong>
              {progress?.phase === 'processing'
                ? uiText.text_e06356df9cbf
                : uiText.text_b4ad4b31d4f7}
            </strong>
            <span>
              {percent === null ? '' : percent.toLocaleString('fa-IR') + uiText.text_a489ae36a167}
            </span>
          </div>
          <progress
            aria-label={uiText.text_b5aeb593a9f9}
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
          />
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X size={17} />
            {uiText.text_f5bcc4fdc106}
          </Button>
        </div>
      )}
      {pending && (
        <div className={s.pending}>
          <Clock3 size={21} />
          <div>
            <strong dir="auto">{pending.originalFileName}</strong>
            <p role="status">
              {pending.status === 'Pending' ? uiText.text_ab2b2b678ccc : uiText.text_c93466e60cc4}
            </p>
            <div className={s.actions}>
              {pending.status === 'Pending' && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || uploading}
                  onClick={onCheck}
                >
                  {uiText.text_64197e65a1c9}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={onDismiss}
              >
                {uiText.text_0cce97418be8}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
