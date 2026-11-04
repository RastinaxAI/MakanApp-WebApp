'use client';
import * as uiText from '@/content/fa';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import type { components } from '@/generated/api/schema';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { usePersonal } from '../provider';
import { ProfileAvatar } from '../profile-photo';
import { conversationCapability } from './management-policy';
import c from './conversation-pages.module.css';
type S = components['schemas'];
export function ConversationAvatar({
  id,
  photo,
  name,
  className = '',
}: {
  id: string;
  photo?: S['ConversationPhotoResult'];
  name: string;
  className?: string;
}) {
  const { session, transfer } = usePersonal();
  const query = useQuery({
    queryKey: ['conversation-photo', session.user.id, session.revision, id, photo?.fileAssetId],
    queryFn: ({ signal }) =>
      transfer<Blob>(
        `/api/client/files/${photo!.fileAssetId}/content?conversationId=${id}&purpose=photo`,
        { signal, binary: true },
      ),
    enabled: !!photo && ['image/jpeg', 'image/png'].includes(photo.contentType.toLowerCase()),
    retry: false,
    gcTime: 0,
  });
  const [url, setUrl] = useState<string>(),
    [broken, setBroken] = useState(false);
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
  if (!url || broken) return <ProfileAvatar name={name} className={className} />;
  return (
    <span className={className} aria-label={name}>
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </span>
  );
}
export function ConversationPhotoEditor({ value }: { value: S['ManagedConversationResult'] }) {
  const { call, transfer, session } = usePersonal(),
    cache = useQueryClient();
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<string>(),
    [asset, setAsset] = useState<S['FileAssetResult']>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false),
    abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const allowed = conversationCapability(value, 'canEditInfo');
  async function apply(result: S['ConversationPhotoMutationResult']) {
    if (result.conversationId !== value.conversationId)
      throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    cache.setQueryData<S['ManagedConversationResult']>(
      [
        'personal',
        session.user.id,
        session.revision,
        '/api/v1/conversations/' + value.conversationId,
      ],
      (old) => (old ? { ...old, ...result } : old),
    );
    setFile(undefined);
    setAsset(undefined);
    await cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
    await cache.invalidateQueries({
      queryKey: ['conversation-photo', session.user.id, session.revision, value.conversationId],
    });
  }
  async function save() {
    if (!file || lock.current || !allowed) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      let uploaded = asset;
      if (!uploaded) {
        const body = new FormData();
        body.append('File', file);
        uploaded = await transfer<S['FileAssetResult']>(
          `/api/client/files?conversationId=${value.conversationId}&purpose=photo`,
          { method: 'POST', body, signal: controller.signal },
        );
        setAsset(uploaded);
      } else if (uploaded.status !== 'Ready') {
        uploaded = await transfer<S['FileAssetResult']>(
          `/api/client/files/${uploaded.id}?conversationId=${value.conversationId}&purpose=photo`,
          { signal: controller.signal },
        );
        setAsset(uploaded);
      }
      if (uploaded.status !== 'Ready')
        throw new ApiError(409, { code: 'CONVERSATION_PHOTO_NOT_READY' });
      await apply(
        await call<S['ConversationPhotoMutationResult']>(
          `/api/v1/conversations/${value.conversationId}/photo`,
          {
            method: 'PUT',
            body: JSON.stringify({ fileAssetId: uploaded.id, expectedVersion: value.version }),
          },
        ),
      );
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 412)
        void cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={c.photoEditor}>
      {preview ? (
        <span className={c.editorAvatar}>
          <img
            src={preview}
            alt={uiText.text_b85242f37ccd}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
      ) : (
        <ConversationAvatar
          id={value.conversationId}
          photo={value.photo}
          name={value.title}
          className={c.editorAvatar}
        />
      )}
      {allowed && (
        <label className={c.photoAction}>
          <Camera size={22} />
          {uiText.text_143aeaee6b15}
          <input
            type="file"
            aria-label={uiText.text_a7480130fc2b}
            accept="image/jpeg,image/png"
            disabled={busy}
            onChange={(event) => {
              const next = event.target.files?.[0];
              setError(undefined);
              setAsset(undefined);
              if (next && !['image/jpeg', 'image/png'].includes(next.type)) {
                setError(new Error(uiText.text_5113d0e0e0e8));
                event.target.value = '';
                return;
              }
              setFile(next);
            }}
          />
        </label>
      )}
      {file && (
        <div className={c.pager}>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy
              ? uiText.text_56ec52fa6f01
              : asset && asset.status !== 'Ready'
                ? uiText.text_13f81bac7421
                : uiText.text_51cb4266ea57}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setFile(undefined);
              setAsset(undefined);
              setError(undefined);
            }}
          >
            {uiText.text_4712ca2231df}
          </Button>
        </div>
      )}
      {allowed && value.photo && (
        <ConfirmAction
          destructive
          title={uiText.text_b2f86f358502}
          trigger={uiText.text_b2f86f358502}
          description={uiText.text_72726ca1cd49}
          onConfirm={async () => {
            await apply(
              await call<S['ConversationPhotoMutationResult']>(
                `/api/v1/conversations/${value.conversationId}/photo?${new URLSearchParams({ expectedVersion: value.version })}`,
                { method: 'DELETE' },
              ),
            );
            return true;
          }}
        />
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
