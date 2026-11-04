'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError } from '@/lib/api/errors';
import type { TransferProgress } from '@/lib/api/file-transfer';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  Camera,
  Check,
  ChevronLeft,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Play,
  RefreshCw,
  Send,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePersonal } from '../provider';
import {
  fileTransferPath,
  formatFileSize,
  safeImagePreview,
  type Attachment,
  type FileAsset,
} from './media-model';
import s from './media.module.css';
import t from './messaging-theme.module.css';
type DraftFile = {
  key: string;
  file: globalThis.File;
  preview?: string;
  asset?: FileAsset;
  phase: 'selected' | 'uploading' | 'processing' | 'ready' | 'error' | 'paused';
  progress?: TransferProgress;
  error?: string;
};
function errorText(error: unknown) {
  return error instanceof Error ? error.message : uiText.text_c9d95977a264;
}
function TransferMeter({ progress, label }: { progress?: TransferProgress; label: string }) {
  const percent =
    progress?.total && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : null;
  return (
    <div className={s.meter}>
      <span>
        {label}
        {percent !== null
          ? ' · ' + new Intl.NumberFormat('fa-IR').format(percent) + uiText.text_a489ae36a167
          : ''}
      </span>
      <progress max={100} value={percent ?? undefined} aria-label={label} />
      {progress && progress.loaded > 0 && (
        <small>
          {formatFileSize(progress.loaded)}
          {progress.total ? uiText.text_a624a1e41ffd + formatFileSize(progress.total) : ''}
        </small>
      )}
    </div>
  );
}
export function AttachmentPicker({
  conversationId,
  disabled,
  caption,
  onSend,
}: {
  conversationId: string;
  disabled: boolean;
  caption: string;
  onSend: (files: FileAsset[], caption: string) => Promise<boolean>;
}) {
  const { session, transfer } = usePersonal();
  const [items, setItems] = useState<DraftFile[]>([]),
    [open, setOpen] = useState(false),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [phase, setPhase] = useState<'upload' | 'sending'>('upload'),
    [error, setError] = useState('');
  const photo = useRef<HTMLInputElement>(null),
    video = useRef<HTMLInputElement>(null),
    file = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    abort = useRef<AbortController | null>(null),
    alive = useRef(true),
    running = useRef(false),
    previews = useRef(new Set<string>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      for (const url of previews.current) URL.revokeObjectURL(url);
      previews.current.clear();
    };
  }, []);
  function patch(key: string, update: Partial<DraftFile>) {
    if (alive.current)
      setItems((previous) =>
        previous.map((item) => (item.key === key ? { ...item, ...update } : item)),
      );
  }
  function choose(input: HTMLInputElement) {
    if (disabled || running.current) return;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    const next = files.map((selected) => {
      let preview: string | undefined;
      if (safeImagePreview(selected.type) || selected.type.startsWith('video/')) {
        preview = URL.createObjectURL(selected);
        previews.current.add(preview);
      }
      return { key: crypto.randomUUID(), file: selected, preview, phase: 'selected' as const };
    });
    setItems((previous) => [...previous, ...next]);
    setText(caption);
    setError('');
    setOpen(true);
  }
  function remove(item: DraftFile) {
    if (item.preview) {
      URL.revokeObjectURL(item.preview);
      previews.current.delete(item.preview);
    }
    setItems((previous) => previous.filter((row) => row.key !== item.key));
  }
  async function submit() {
    if (running.current || disabled || !items.length) return;
    running.current = true;
    setBusy(true);
    setPhase('upload');
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    let activeKey: string | undefined;
    try {
      const assets: FileAsset[] = [];
      for (const item of items) {
        activeKey = item.key;
        controller.signal.throwIfAborted();
        let asset = item.asset;
        if (!asset) {
          patch(item.key, { phase: 'uploading', error: undefined, progress: undefined });
          const body = new FormData();
          body.append('File', item.file, item.file.name);
          const response = await transfer<unknown>(fileTransferPath(conversationId), {
            method: 'POST',
            body,
            signal: controller.signal,
            onProgress: (progress) =>
              patch(item.key, {
                progress,
                phase: progress.phase === 'processing' ? 'processing' : 'uploading',
              }),
          });
          const parsed = clientValidator({
            $ref: '#/components/schemas/FileAssetResult',
          }).safeParse(response);
          if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
          asset = parsed.data as FileAsset;
          patch(item.key, { asset });
        }
        if (asset.uploadedByUserId !== session.user.id || asset.sizeBytes !== item.file.size)
          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
        if (asset.status === 'Pending') {
          patch(item.key, { phase: 'processing', progress: undefined });
          asset = await transfer<FileAsset>(fileTransferPath(conversationId, asset.id), {
            signal: controller.signal,
          });
          patch(item.key, { asset });
        }
        if (asset.status !== 'Ready')
          throw new Error(
            asset.status === 'Pending' ? uiText.text_89f52370cb8d : uiText.text_417503843545,
          );
        if (asset.uploadedByUserId !== session.user.id || asset.sizeBytes !== item.file.size)
          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
        patch(item.key, { phase: 'ready', asset, error: undefined });
        assets.push(asset);
      }
      controller.signal.throwIfAborted();
      activeKey = undefined;
      setPhase('sending');
      const queued = await onSend(assets, text.trim());
      if (!queued) throw new Error(uiText.text_facb92f52d74);
      if (alive.current) {
        for (const item of items)
          if (item.preview) {
            URL.revokeObjectURL(item.preview);
            previews.current.delete(item.preview);
          }
        setItems([]);
        setText('');
        setOpen(false);
      }
    } catch (error) {
      if (alive.current) {
        const canceled = error instanceof Error && error.name === 'AbortError';
        const message = canceled ? uiText.text_fbc1848b434f : errorText(error);
        if (activeKey) patch(activeKey, { phase: canceled ? 'paused' : 'error', error: message });
        setError(message);
      }
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      <Menu.Root dir="rtl">
        <Menu.Trigger asChild>
          <button
            type="button"
            ref={trigger}
            className={s.attachButton}
            aria-label={uiText.text_01eac8227680}
            disabled={disabled || busy}
          >
            <Paperclip size={23} />
            {items.length > 0 && <b>{new Intl.NumberFormat('fa-IR').format(items.length)}</b>}
          </button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            className={`dropdown ${t.theme} ${t.menu} ${s.attachMenu}`}
            side="top"
            align="start"
            sideOffset={12}
          >
            {items.length > 0 && (
              <Menu.Item onSelect={() => setOpen(true)}>
                <Paperclip size={19} />
                {uiText.text_00cd0fea581c}
                <ChevronLeft size={16} />
              </Menu.Item>
            )}
            <Menu.Item onSelect={() => camera.current?.click()}>
              <Camera size={20} />
              {uiText.text_4cab0b40565e}
            </Menu.Item>
            <Menu.Item onSelect={() => photo.current?.click()}>
              <ImageIcon size={20} />
              {uiText.text_5c661ce3aa5f}
            </Menu.Item>
            <Menu.Item onSelect={() => video.current?.click()}>
              <Video size={20} />
              {uiText.text_de0372679118}
            </Menu.Item>
            <Menu.Item onSelect={() => file.current?.click()}>
              <File size={20} />
              {uiText.text_9974dd3a9f4a}
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label={uiText.text_15e11a432ae3}
        onChange={(event) => choose(event.currentTarget)}
      />
      <input
        ref={photo}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={uiText.text_9105d8bdec0d}
        onChange={(event) => choose(event.currentTarget)}
      />
      <input
        ref={video}
        type="file"
        accept="video/*"
        multiple
        hidden
        aria-label={uiText.text_8815ba986d1a}
        onChange={(event) => choose(event.currentTarget)}
      />
      <input
        ref={file}
        type="file"
        multiple
        hidden
        aria-label={uiText.text_02cc50e960a7}
        onChange={(event) => choose(event.currentTarget)}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && phase === 'upload') abort.current?.abort();
          setOpen(next);
        }}
      >
        <DialogContent
          className={`${t.theme} ${t.dialog}`}
          title={uiText.text_4314e718c6d3}
          description={uiText.text_43428a0f7e51}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <form
            className={s.sendSheet}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void submit();
            }}
          >
            <div className={s.draftList}>
              {items.map((item) => (
                <article key={item.key} className={s.draftCard}>
                  <div className={s.draftThumb}>
                    {item.preview ? (
                      item.file.type.startsWith('video/') ? (
                        <video src={item.preview} muted playsInline preload="metadata" />
                      ) : (
                        <img src={item.preview} alt={item.file.name} />
                      )
                    ) : (
                      <FileText size={30} />
                    )}
                  </div>
                  <div className={s.draftInfo}>
                    <strong dir="auto">{item.file.name}</strong>
                    <small>{formatFileSize(item.file.size)}</small>
                    {item.phase === 'uploading' || item.phase === 'processing' ? (
                      <TransferMeter
                        progress={item.progress}
                        label={
                          item.phase === 'processing'
                            ? uiText.text_066f81d641f6
                            : uiText.text_c16dbde9ad0a
                        }
                      />
                    ) : item.phase === 'ready' ? (
                      <span className={s.ready}>
                        <Check size={14} />
                        {uiText.text_69791a3b81bf}
                      </span>
                    ) : item.error ? (
                      <span className={s.itemError}>{item.error}</span>
                    ) : (
                      <span className={s.selected}>{uiText.text_e14b064baee8}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={s.remove}
                    aria-label={uiText.text_6f5fc5cfc9f9 + item.file.name}
                    disabled={busy}
                    onClick={() => remove(item)}
                  >
                    <X size={18} />
                  </button>
                </article>
              ))}
            </div>
            <label className={s.caption}>
              {uiText.text_eaca3b73fa59}
              <textarea
                rows={2}
                value={text}
                disabled={busy}
                onChange={(event) => setText(event.target.value)}
                placeholder={uiText.text_9c09cbe3bb04}
              />
            </label>
            {error && (
              <p className={s.transferError} role="alert">
                {error}
              </p>
            )}
            <div className={s.sheetActions}>
              {busy && phase === 'upload' ? (
                <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
                  {uiText.text_a72404308ae9}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  {uiText.text_fe8b0330df51}
                </Button>
              )}
              <Button type="submit" disabled={busy || !items.length || disabled}>
                {busy ? <LoaderCircle className={s.spin} size={18} /> : <Send size={18} />}{' '}
                {busy
                  ? phase === 'sending'
                    ? uiText.text_e735f9d9a2a5
                    : uiText.text_2096f4c8f035
                  : uiText.text_85983403b43f +
                    new Intl.NumberFormat('fa-IR').format(items.length) +
                    uiText.text_46b99be686ec}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function AttachmentSummary({ attachments }: { attachments?: Attachment[] }) {
  return attachments?.length ? (
    <div className={s.pendingFiles}>
      {attachments.map((asset) => (
        <span key={asset.fileAssetId}>
          <Paperclip size={15} />
          <bdi>{asset.fileName}</bdi>
        </span>
      ))}
    </div>
  ) : null;
}
export function MessageAttachment({
  asset,
  conversationId,
}: {
  asset: Attachment;
  conversationId: string;
}) {
  const { transfer } = usePersonal();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    [progress, setProgress] = useState<TransferProgress>(),
    [url, setUrl] = useState<string>(),
    [error, setError] = useState(''),
    [playbackError, setPlaybackError] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    abort = useRef<AbortController | null>(null),
    alive = useRef(true),
    objectUrl = useRef<string | undefined>(undefined),
    busy = useRef(false),
    loadRef = useRef<() => void>(() => {});
  const image = safeImagePreview(asset.contentType),
    video = asset.contentType.startsWith('video/'),
    audio = asset.contentType.startsWith('audio/');
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  async function load() {
    if (busy.current || url) return;
    busy.current = true;
    setPhase('loading');
    setProgress(undefined);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const blob = await transfer<Blob>(fileTransferPath(conversationId, asset.fileAssetId, true), {
        binary: true,
        expectedBytes: asset.sizeBytes,
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (!alive.current || controller.signal.aborted) return;
      const value = URL.createObjectURL(new Blob([blob], { type: asset.contentType }));
      objectUrl.current = value;
      setUrl(value);
      setPhase('ready');
    } catch (error) {
      if (alive.current) {
        const canceled = error instanceof Error && error.name === 'AbortError';
        setPhase(canceled ? 'idle' : 'error');
        setError(canceled ? uiText.text_876c53967879 : errorText(error));
      }
    } finally {
      busy.current = false;
    }
  }
  loadRef.current = () => void load();
  useEffect(() => {
    if (!image || !root.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadRef.current();
          observer.disconnect();
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [image]);
  return (
    <div ref={root} className={`${s.attachment} ${image || video ? s.mediaAttachment : ''}`}>
      {phase === 'ready' && url ? (
        <>
          {image ? (
            <a
              className={s.imageLink}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={uiText.text_d7a06d9eaca7 + asset.fileName}
            >
              <img
                src={url}
                alt={asset.fileName}
                loading="lazy"
                onError={() => setPlaybackError(true)}
              />
            </a>
          ) : video ? (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              onError={() => setPlaybackError(true)}
            />
          ) : audio ? (
            <audio src={url} controls preload="metadata" onError={() => setPlaybackError(true)} />
          ) : null}
          <div className={s.fileReady}>
            <FileText size={19} />
            <span>
              <strong dir="auto">{asset.fileName}</strong>
              <small>{formatFileSize(asset.sizeBytes)}</small>
            </span>
            <a
              href={url}
              download={asset.fileName}
              aria-label={uiText.text_6e159b54bc47 + asset.fileName}
            >
              <Download size={19} />
            </a>
          </div>
          {playbackError && <small className={s.itemError}>{uiText.text_5f11ce92fa61}</small>}
        </>
      ) : (
        <>
          <div className={s.fileIntro}>
            <span className={s.fileIcon}>
              {image ? (
                <ImageIcon size={24} />
              ) : video ? (
                <Video size={24} />
              ) : audio ? (
                <Play size={24} />
              ) : (
                <FileText size={24} />
              )}
            </span>
            <div>
              <strong dir="auto">{asset.fileName}</strong>
              <small>{formatFileSize(asset.sizeBytes)}</small>
            </div>
            <button
              type="button"
              aria-label={
                phase === 'loading'
                  ? uiText.text_5aea7c460498 + asset.fileName
                  : uiText.text_1e229eb338a6 + asset.fileName
              }
              onClick={() => (phase === 'loading' ? abort.current?.abort() : void load())}
            >
              {phase === 'loading' ? (
                <X size={20} />
              ) : phase === 'error' ? (
                <RefreshCw size={20} />
              ) : (
                <Download size={20} />
              )}
            </button>
          </div>
          {phase === 'loading' && (
            <TransferMeter progress={progress} label={uiText.text_3ebc8cefd354} />
          )}
          {error && (
            <p role={phase === 'error' ? 'alert' : 'status'} className={s.transferError}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
