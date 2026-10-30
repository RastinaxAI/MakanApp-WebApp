'use client';
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
    <section className={s.panel} aria-label="پیوست‌های درس" aria-busy={uploading}>
      <header className={s.heading}>
        <span className={s.icon}>
          <Paperclip size={22} />
        </span>
        <div>
          <h2>پیوست‌های درس</h2>
          <p>فایل‌های آموزشی را انتخاب کنید؛ پس از آماده‌شدن همراه درس ذخیره می‌شوند.</p>
        </div>
        <span className={s.count}>{assets.length.toLocaleString('fa-IR')} فایل</span>
      </header>
      <div className={s.picker}>
        <Upload size={27} />
        <div>
          <strong>جزوه، تصویر یا فایل آموزشی</strong>
          <p id={id}>هر فایل را انتخاب کنید و تا پایان بارگذاری منتظر بمانید.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading || !!pending}
          onClick={() => input.current?.click()}
        >
          <Upload size={18} />
          انتخاب فایل
        </Button>
        <input
          ref={input}
          type="file"
          className={s.fileInput}
          tabIndex={-1}
          disabled={disabled || uploading || !!pending}
          aria-label="پیوست درس"
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
                  {asset.sizeBytes === undefined ? 'فایل پیوست' : formatFileSize(asset.sizeBytes)}
                  {asset.status === 'Ready' ? ' · آمادهٔ ذخیره' : ''}
                </small>
              </div>
              {asset.status === 'Ready' && <CheckCircle2 size={18} className={s.ready} />}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || uploading}
                aria-label={'حذف پیوست ' + asset.name}
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
              {progress?.phase === 'processing' ? 'در حال بررسی فایل…' : 'در حال بارگذاری…'}
            </strong>
            <span>{percent === null ? '' : percent.toLocaleString('fa-IR') + '٪'}</span>
          </div>
          <progress
            aria-label="پیشرفت بارگذاری جزوه"
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
          />
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X size={17} />
            لغو بارگذاری
          </Button>
        </div>
      )}
      {pending && (
        <div className={s.pending}>
          <Clock3 size={21} />
          <div>
            <strong dir="auto">{pending.originalFileName}</strong>
            <p role="status">
              {pending.status === 'Pending'
                ? 'فایل در حال بررسی است؛ هنوز به پیوست‌های درس اضافه نشده.'
                : 'این فایل برای پیوست قابل استفاده نیست؛ فایل دیگری انتخاب کنید.'}
            </p>
            <div className={s.actions}>
              {pending.status === 'Pending' && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || uploading}
                  onClick={onCheck}
                >
                  بررسی وضعیت فایل
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={onDismiss}
              >
                کنار گذاشتن فایل
              </Button>
            </div>
          </div>
        </div>
      )}
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
