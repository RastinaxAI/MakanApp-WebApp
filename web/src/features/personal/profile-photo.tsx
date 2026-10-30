'use client';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { useQuery } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import s from './profile-photo.module.css';
import { usePersonal } from './provider';
type Photo = components['schemas']['ProfilePhotoResult'];
type Asset = components['schemas']['FileAssetResult'];

export function ProfileAvatar({
  photo,
  name,
  className = '',
}: {
  photo?: Photo;
  name: string;
  className?: string;
}) {
  const { session, transfer } = usePersonal();
  const query = useQuery({
    queryKey: ['profile-photo', session.user.id, session.revision, photo?.fileAssetId],
    queryFn: ({ signal }) =>
      transfer<Blob>('/api/client/profile-media/' + photo!.fileAssetId, { signal, binary: true }),
    enabled: !!photo && ['image/jpeg', 'image/png'].includes(photo.contentType.toLowerCase()),
    staleTime: 300000,
    gcTime: 0,
    retry: false,
  });
  const [url, setUrl] = useState<string>();
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
    if (!query.data) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(query.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [query.data]);
  return (
    <span className={`${s.avatar} ${className}`} aria-label={name}>
      {url && !broken ? (
        <img src={url} alt="" onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden="true">{name.trim().slice(0, 1) || 'م'}</span>
      )}
    </span>
  );
}

export function ProfilePhotoEditor({
  disabled = false,
  onBusyChange,
}: {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { session, transfer, call, reload } = usePersonal();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [uploaded, setUploaded] = useState<Asset>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<TransferProgress>();
  const [error, setError] = useState<unknown>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save() {
    if (!file || busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(undefined);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let asset = uploaded;
      if (!asset) {
        const body = new FormData();
        body.append('File', file);
        asset = await transfer<Asset>('/api/client/profile-media', {
          method: 'POST',
          body,
          signal: abort.signal,
          onProgress: setProgress,
        });
        setUploaded(asset);
      } else if (asset.status !== 'Ready') {
        asset = await transfer<Asset>(`/api/client/profile-media/${asset.id}/metadata`, {
          signal: abort.signal,
        });
        setUploaded(asset);
      }
      if (asset.status !== 'Ready') {
        throw new Error(
          asset.status === 'Pending'
            ? 'عکس هنوز در حال آماده‌سازی است؛ کمی بعد «بررسی و ثبت عکس» را بزنید.'
            : 'این عکس آمادهٔ استفاده نیست. عکس دیگری انتخاب کنید.',
        );
      }
      setProgress({ phase: 'processing', loaded: 0, total: null });
      await call('/api/v1/me/profile-photo', {
        method: 'PUT',
        body: JSON.stringify({ fileAssetId: asset.id }),
      });
      await reload();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      setProgress(undefined);
    }
  }
  async function remove() {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(undefined);
    try {
      await call('/api/v1/me/profile-photo', { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className={s.editor} aria-label="عکس پروفایل">
      <div className={s.identity}>
        {preview ? (
          <span className={s.preview}>
            <img src={preview} alt="پیش‌نمایش عکس انتخاب‌شده" />
          </span>
        ) : (
          <ProfileAvatar
            photo={session.user.profilePhoto}
            name={session.user.displayName || session.user.firstName || 'حساب من'}
            className={s.preview}
          />
        )}
        <div>
          <h2>عکس پروفایل</h2>
          <p>عکس JPEG یا PNG انتخاب کنید.</p>
        </div>
      </div>
      <div className={s.actions}>
        <label className={s.choose}>
          <Camera size={18} /> انتخاب عکس
          <input
            aria-label="انتخاب عکس پروفایل"
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy || disabled}
            onChange={(e) => {
              const next = e.target.files?.[0];
              setError(undefined);
              setUploaded(undefined);
              if (next && !['image/jpeg', 'image/png'].includes(next.type)) {
                setError(new Error('فقط عکس JPEG یا PNG انتخاب کنید.'));
                setFile(undefined);
                e.target.value = '';
                return;
              }
              setFile(next);
            }}
          />
        </label>
        {file && (
          <Button type="button" disabled={busy || disabled} onClick={() => void save()}>
            {busy ? 'در حال ثبت عکس…' : uploaded ? 'بررسی و ثبت عکس' : 'ثبت عکس'}
          </Button>
        )}
        {session.user.profilePhoto && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || disabled}
            onClick={() => void remove()}
          >
            <Trash2 size={17} /> حذف عکس پروفایل
          </Button>
        )}
      </div>
      {disabled && (
        <p className={s.help}>برای تغییر عکس، ابتدا تغییرات اطلاعات پروفایل را ثبت کنید.</p>
      )}
      {progress && (
        <div role="status" className={s.progress}>
          <span>
            {progress.phase === 'uploading' ? 'در حال بارگذاری عکس' : 'در حال آماده‌سازی و ثبت عکس'}
            {progress.total
              ? ` · ${Math.min(100, Math.round((progress.loaded / progress.total) * 100)).toLocaleString('fa-IR')}٪`
              : '…'}
          </span>
          <progress
            aria-label="بارگذاری عکس"
            {...(progress.total ? { value: progress.loaded, max: progress.total } : {})}
          />
        </div>
      )}
      {!!error &&
        (error instanceof ApiError ? (
          <ErrorState error={error} />
        ) : (
          <p role="alert">
            {error instanceof Error ? error.message : 'ثبت عکس انجام نشد؛ دوباره بررسی کنید.'}
          </p>
        ))}
    </section>
  );
}
