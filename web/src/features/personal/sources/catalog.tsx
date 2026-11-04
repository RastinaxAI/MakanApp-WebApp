'use client';
import '@/features/reference/bundles/features-personal-sources-catalog';

import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileText, Search, Plus } from 'lucide-react';
import { ReferenceScreen, referenceNodeKey } from '@/features/reference/screen';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { useViewState } from '@/components/hooks/use-view-state';
import { ConnectionNotice } from '@/components/ui/connection-notice';
import type { components } from '@/generated/api/schema';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError } from '@/lib/api/errors';
import { date, number } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { sourceScopes, sourceDownloadable, sourceReadiness } from './model';
import s from '../service-layout.module.css';
type S = components['schemas'];
type Scope = S['EducationalSourceScope'];
const base = '/personal/resources';
export function SourceCatalog({
  upload = false,
  initialScope = 'Personal',
  initialClassId = '',
}: { upload?: boolean; initialScope?: Scope; initialClassId?: string } = {}) {
  const router = useRouter();
  const { session } = usePersonal();
  const memory =
    'makan:draft:view:' +
    session.user.id +
    ':' +
    session.revision +
    ':resources:' +
    String(upload) +
    ':' +
    initialScope +
    ':' +
    initialClassId +
    ':';
  const [readiness, setReadiness] = useViewState(
    memory + 'readiness',
    uiText.text_15270886eadd,
    (v): v is string =>
      typeof v === 'string' &&
      [uiText.text_15270886eadd, uiText.text_376e9c9561e2, uiText.text_68bfe264e2cf].includes(v),
  );
  const [scope, setScope, scopeRestored] = useViewState<Scope>(
      memory + 'scope',
      initialScope,
      (v): v is Scope => typeof v === 'string' && Object.hasOwn(sourceScopes, v),
    ),
    [classId, setClass, classRestored] = useViewState(
      memory + 'class',
      initialClassId,
      (v): v is string => typeof v === 'string' && (!v || /^[0-9a-f-]{36}$/i.test(v)),
    ),
    [search, setSearch] = useViewState(
      memory + 'search',
      '',
      (v): v is string => typeof v === 'string' && v.length <= 200,
    ),
    [page, setPage] = useViewState(
      memory + 'page',
      1,
      (v): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0,
    );
  const org = session.context.workspaceType === 'Organization',
    role = session.context.activeRole,
    school = org && ['Teacher', 'Student', 'Manager'].includes(role ?? '');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: school && scope === 'Class',
  });
  const params = new URLSearchParams({ Scope: scope, Page: String(page), PageSize: '20' });
  if (search) params.set('Search', search);
  if (scope === 'Class' && classId) params.set('ClassId', classId);
  const query = usePersonalApi<S['SourcePage']>('/api/v1/sources?' + params, {
    enabled: scopeRestored && classRestored && (scope !== 'Class' || (school && !!classId)),
  });
  const create =
    scope === 'Personal' ||
    (school &&
      ((scope === 'Class' && ['Teacher', 'Manager'].includes(role ?? '')) ||
        (scope === 'Organization' && role === 'Manager')));
  const rows = (query.data?.items ?? []).filter(
    (item) =>
      readiness === uiText.text_15270886eadd ||
      (readiness === uiText.text_376e9c9561e2
        ? item.fileReady && item.sourceReady
        : ['Pending', 'Queued', 'Processing'].includes(item.processingStatus)),
  );
  const content = (
    <>
      <ConnectionNotice
        cached={!!query.data}
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
      <label className="search">
        <Search size={19} />
        <input
          aria-label={uiText.text_c7ffe2197db2}
          placeholder={uiText.text_8cc9dcd7a18e}
          value={search}
          maxLength={100}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <label className="field">
        {uiText.text_be51a88d392d}
        <select
          value={scope}
          onChange={(event) => {
            setScope(event.target.value as Scope);
            setPage(1);
          }}
        >
          {(Object.keys(sourceScopes) as Scope[])
            .filter((value) => school || !['Class', 'Organization'].includes(value))
            .map((value) => (
              <option key={value} value={value}>
                {sourceScopes[value]}
              </option>
            ))}
        </select>
      </label>
      {scope === 'Class' &&
        (classes.isPending ? (
          <LoadingSkeleton />
        ) : classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
        ) : (
          <label className="field">
            {uiText.text_dab8b743e1f2}
            <select
              value={classId}
              onChange={(event) => {
                setClass(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{uiText.text_28867895dae8}</option>
              {classes.data.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
        ))}
      {scope === 'Library' && <div className="alert">{uiText.text_5a1c9deed686}</div>}
      <div className="chips" role="group" aria-label={uiText.text_3043b5ecb0c3}>
        {[uiText.text_15270886eadd, uiText.text_376e9c9561e2, uiText.text_68bfe264e2cf].map(
          (name) => (
            <button
              className={'chip ' + (readiness === name ? 'on' : '')}
              onClick={() => setReadiness(name)}
              key={name}
            >
              {name}
            </button>
          ),
        )}
      </div>
      {scope === 'Class' && (!school || !classId) ? (
        <EmptyState title={uiText.text_3b83b26abcf0} />
      ) : query.isPending ? (
        <LoadingSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="list">
            {!rows.length ? (
              <EmptyState title={search ? uiText.text_76263ba743f2 : uiText.text_d00189e07062} />
            ) : (
              rows.map((source) => (
                <Link
                  href={base + '/' + source.sourceId}
                  aria-label={source.title}
                  className="row mk-source-row"
                  key={source.sourceId}
                >
                  <span className="tile-icon">
                    <FileText size={22} />
                  </span>
                  <span className="grow">
                    <h4 dir="auto">{source.title}</h4>
                    <SourceStatus source={source} />
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="between">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {uiText.text_88e65319d694}
            </Button>
            <span className="tiny muted">
              {uiText.text_2714496eef16}
              {number(page)}
            </span>
            <Button
              variant="ghost"
              disabled={page * query.data!.pageSize >= query.data!.totalCount}
              onClick={() => setPage(page + 1)}
            >
              {uiText.text_12ca1a58c6ca}
            </Button>
          </div>
        </>
      )}
      <div className="spacer" />
      {create && (scope !== 'Class' || !!classId) && (
        <Button
          onClick={() =>
            router.push(
              base +
                '?' +
                new URLSearchParams({
                  upload: '1',
                  scope,
                  ...(scope === 'Class' ? { classId } : {}),
                }),
            )
          }
        >
          <Plus size={19} />
          {uiText.text_1d488a965baa}
        </Button>
      )}
    </>
  );
  return (
    <ReferenceSourceFrame id={upload ? 'MK-42' : 'MK-41'} scope={sourceScopes[scope]}>
      {upload ? (
        create && (scope !== 'Class' || !!classId) ? (
          <SourceUpload
            key={scope + classId}
            scope={scope as Exclude<Scope, 'Library'>}
            classId={scope === 'Class' ? classId : null}
          />
        ) : (
          <ErrorState error={new ApiError(403)} />
        )
      ) : (
        content
      )}
    </ReferenceSourceFrame>
  );
}
function ReferenceSourceFrame({
  id,
  scope,
  title,
  children,
}: {
  id: string;
  scope?: string;
  title?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <ReferenceScreen
      id={id}
      bindings={{
        heading: {
          title: title ?? (id === 'MK-43' ? uiText.text_8a52f7bc3f5c : undefined),
          subtitle: scope ? uiText.text_638b8573191f + scope : uiText.text_b0226c6cf2bd,
        },
        onChange: () => {},
        onAction: (control) =>
          router.push(
            control.label === uiText.common_back ? '/personal/resources' : '/personal/profile',
          ),
        replacements: {
          [referenceNodeKey(id, 'app-body')!]: (
            <div className="app-body">
              <div className="mk-source-surface">{children}</div>
            </div>
          ),
          ...(referenceNodeKey(id, 'fixed-actions')
            ? { [referenceNodeKey(id, 'fixed-actions')!]: null }
            : {}),
        },
      }}
    />
  );
}
export function SourceStatus({ source }: { source: S['EducationalSourceResult'] }) {
  return (
    <>
      <p className={s.meta}>
        {sourceScopes[source.scope]}
        {uiText.text_78887da22764}{' '}
        {source.publicationStatus === 'Published'
          ? uiText.text_e4f1cf0d1e04
          : uiText.text_410c47c7f8b7}
        {uiText.text_78887da22764}{' '}
        {source.status === 'Archived'
          ? uiText.text_9defd77e1a5d
          : source.status === 'Inactive'
            ? uiText.text_4e67bd8e3482
            : uiText.text_a3fa2a3ffcb9}{' '}
        {uiText.text_530d0a0f20e9}
        {number(source.revision)}
      </p>
      <div className={s.row}>
        {sourceReadiness(source).map((item) => (
          <span key={item.title} className={s.status}>
            {item.title}
            {uiText.text_45822f54a0d0}
            {item.ready ? uiText.text_376e9c9561e2 : uiText.text_f7b3cdaee0a4}
          </span>
        ))}
      </div>
    </>
  );
}
function SourceUpload({
  scope,
  classId,
  source,
  onSaved,
}: {
  scope: Exclude<Scope, 'Library'>;
  classId: string | null;
  source?: S['EducationalSourceResult'];
  onSaved?: (value: S['EducationalSourceResult']) => void;
}) {
  const { session, call, transfer } = usePersonal(),
    router = useRouter(),
    cache = useQueryClient();
  const [file, setFile] = useState<File>(),
    [asset, setAsset] = useState<S['FileAssetResult']>(),
    [title, setTitle] = useState(source?.title ?? ''),
    [description, setDescription] = useState(source?.description ?? ''),
    [reason, setReason] = useState(''),
    [frozen, setFrozen] = useState<S['CreateEducationalSourceCommand']>(),
    [versionExpected, setVersionExpected] = useState<string>(),
    [restored, setRestored] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false),
    controller = useRef<AbortController | null>(null);
  const key = `makan:draft:source-create:${session.user.id}:${session.revision}:${scope}:${classId ?? ''}`;
  useUnsavedChanges(!!file || !!frozen);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (source) {
      setRestored(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const result = clientValidator({
          $ref: '#/components/schemas/CreateEducationalSourceCommand',
        }).safeParse(JSON.parse(raw));
        if (!result.success) throw new Error(uiText.text_b4ea75ad2e71);
        const value = result.data as S['CreateEducationalSourceCommand'];
        if (value.scope !== scope || value.classId !== classId)
          throw new Error(uiText.text_1fa2b828a69e);
        setFrozen(value);
        setTitle(value.title);
        setDescription(value.description ?? '');
        setReason(value.reason);
      }
      setRestored(true);
    } catch (e) {
      setError(e);
    }
  }, [key, source, scope, classId]);
  async function save() {
    if (lock.current || !restored) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    controller.current = new AbortController();
    try {
      let command = frozen;
      if (!command) {
        if (!file || !title.trim() || !reason.trim()) return;
        let uploaded = asset;
        const suffix = new URLSearchParams({ scope, ...(classId ? { classId } : {}) });
        if (!uploaded) {
          const body = new FormData();
          body.append('File', file);
          uploaded = await transfer<S['FileAssetResult']>('/api/client/source-files?' + suffix, {
            method: 'POST',
            body,
            signal: controller.current.signal,
          });
          setAsset(uploaded);
        } else if (uploaded.status !== 'Ready') {
          uploaded = await transfer<S['FileAssetResult']>(
            '/api/client/source-files/' + uploaded.id + '?' + suffix,
            { signal: controller.current.signal },
          );
          setAsset(uploaded);
        }
        if (uploaded.status !== 'Ready') throw new ApiError(409, { code: 'FILE_NOT_READY' });
        command = {
          clientOperationId: crypto.randomUUID(),
          scope,
          classId,
          title: title.trim(),
          description: description.trim() || null,
          fileAssetId: uploaded.id,
          reason: reason.trim(),
        };
        if (!source) {
          sessionStorage.setItem(key, JSON.stringify(command));
          setFrozen(command);
        }
      }
      if (source && !versionExpected) setVersionExpected(source.version);
      const value = await call<S['EducationalSourceResult']>(
        source ? `/api/v1/sources/${source.sourceId}/versions` : '/api/v1/sources',
        {
          method: 'POST',
          body: JSON.stringify(
            source
              ? {
                  fileAssetId: command.fileAssetId,
                  title: command.title,
                  description: command.description,
                  reason: command.reason,
                  expectedVersion: versionExpected ?? source.version,
                }
              : command,
          ),
        },
      );
      if (
        value.scope !== scope ||
        value.classId !== classId ||
        (source && value.sourceId !== source.sourceId)
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      setFile(undefined);
      setAsset(undefined);
      setFrozen(undefined);
      setVersionExpected(undefined);
      if (!source) sessionStorage.removeItem(key);
      if (onSaved) onSaved(value);
      else router.push(base + '/' + value.sourceId);
    } catch (e) {
      setError(e);
      if (source && e instanceof ApiError && e.status === 412)
        void cache.invalidateQueries({
          queryKey: [
            'personal',
            session.user.id,
            session.revision,
            '/api/v1/sources/' + source.sourceId,
          ],
        });
      if (!source && e instanceof ApiError && [400, 403, 404, 422].includes(e.status)) {
        sessionStorage.removeItem(key);
        setFrozen(undefined);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className={s.panel}
      aria-label={source ? uiText.text_6b5fcc9a7cd5 : uiText.text_1d488a965baa}
    >
      <h2>{source ? uiText.text_6b5fcc9a7cd5 : uiText.text_1d488a965baa}</h2>
      <p className={s.hint}>{uiText.text_b7e453cfcea7}</p>
      <fieldset disabled={busy || !!frozen || !!versionExpected}>
        <label className={s.field}>
          {uiText.text_e3a6d4896346}
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={s.field}>
          {uiText.text_5e89fc890d9e}
          <textarea
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className={s.field}>
          {uiText.text_a69eb3885a5b}
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0]);
              setAsset(undefined);
            }}
          />
        </label>
        <label className={s.field}>
          {uiText.text_dc267e54e1df}
          <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </label>
      </fieldset>
      {asset && (
        <p className={s.meta}>
          {uiText.text_db42134fccc6}{' '}
          {asset.status === 'Ready'
            ? uiText.text_376e9c9561e2
            : asset.status === 'Pending'
              ? uiText.text_10312842c4e7
              : uiText.text_f7b3cdaee0a4}
        </p>
      )}
      {frozen && <p className={s.hint}>{uiText.text_c83a7d86b4fd}</p>}
      {source && versionExpected && versionExpected !== source.version && (
        <>
          <p className={s.hint}>{uiText.text_9cf6d41e477e}</p>
          <ConfirmAction
            title={uiText.text_e3963cf48bc3}
            trigger={uiText.text_1ae4d3eba9ba}
            description={uiText.text_9efe7df540e7}
            disabled={busy}
            onConfirm={async () => {
              setVersionExpected(undefined);
              setError(undefined);
              return true;
            }}
          />
        </>
      )}
      <Button
        disabled={busy || !restored || (!frozen && (!file || !title.trim() || !reason.trim()))}
        onClick={() => void save()}
      >
        {busy
          ? uiText.text_b5ef00b1806f
          : frozen
            ? uiText.text_3f86e11c3190
            : asset && asset.status !== 'Ready'
              ? uiText.text_2ec5f09bb601
              : source
                ? uiText.text_6037c81e20c1
                : uiText.text_914c38333ec6}
      </Button>
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
export function SourceDetail({ id }: { id: string }) {
  const q = usePersonalApi<S['EducationalSourceResult']>('/api/v1/sources/' + id, { poll: 10000 });
  return (
    <ReferenceSourceFrame
      id="MK-43"
      title={q.data?.title}
      scope={q.data ? sourceScopes[q.data.scope] : undefined}
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.sourceId !== id ? (
        <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />
      ) : (
        <ResolvedSource key={id} source={q.data} refresh={() => void q.refetch()} />
      )}
    </ReferenceSourceFrame>
  );
}
function ResolvedSource({
  source,
  refresh,
}: {
  source: S['EducationalSourceResult'];
  refresh: () => void;
}) {
  const { call, transfer, session } = usePersonal(),
    cache = useQueryClient();
  const [title, setTitle] = useState(source.title),
    [description, setDescription] = useState(source.description ?? ''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState('');
  const lock = useRef(false),
    controller = useRef<AbortController | null>(null),
    baseline = useRef(source.version);
  const dirty = title !== source.title || description !== (source.description ?? '');
  useUnsavedChanges(dirty);
  useEffect(() => () => controller.current?.abort(), []);
  async function accept(value: S['EducationalSourceResult']) {
    if (value.sourceId !== source.sourceId) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    cache.setQueryData(
      ['personal', session.user.id, session.revision, '/api/v1/sources/' + source.sourceId],
      value,
    );
    setTitle(value.title);
    setDescription(value.description ?? '');
    baseline.current = value.version;
    setSuccess(uiText.text_a1b4ad75b5a1);
    await cache.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'personal' &&
        query.queryKey[1] === session.user.id &&
        query.queryKey[2] === session.revision &&
        query.queryKey.some((key) => typeof key === 'string' && key.startsWith('/api/v1/sources')),
    });
  }
  async function mutate(action: 'draft' | 'publish' | 'archive' | 'visibility') {
    if (lock.current || !reason.trim()) return false;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess('');
    try {
      await accept(
        await call<S['EducationalSourceResult']>(`/api/v1/sources/${source.sourceId}/${action}`, {
          method: action === 'draft' ? 'PATCH' : action === 'visibility' ? 'PUT' : 'POST',
          body: JSON.stringify({
            expectedVersion: baseline.current,
            reason: reason.trim(),
            ...(action === 'draft'
              ? { title: title.trim(), description: description.trim() || null }
              : {}),
            ...(action === 'visibility'
              ? { visibility: source.visibility === 'Public' ? 'Hidden' : 'Public' }
              : {}),
          }),
        }),
      );
      return true;
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 412) refresh();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function download() {
    if (lock.current || !sourceDownloadable(source)) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    controller.current = new AbortController();
    try {
      const blob = await transfer<Blob>(
        `/api/client/source-files/${source.sourceId}/content?revision=${source.revision}`,
        { signal: controller.current.signal, binary: true, expectedBytes: source.file!.sizeBytes },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = source.file!.originalFileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1 dir="auto">{source.title}</h1>
        <PageBack href={base} />
      </header>
      <section className={s.panel}>
        <SourceStatus source={source} />
        <p dir="auto">{source.description}</p>
        <dl className={s.detail}>
          <div>
            <dt>{uiText.text_c1a1a454512d}</dt>
            <dd>
              {
                {
                  PendingValidation: uiText.text_e81c80fd6d5f,
                  FileValidated: uiText.text_a94b0a08c898,
                  ReviewRequired: uiText.text_93865396d0f0,
                  Rejected: uiText.text_1d51178c62a6,
                }[source.safetyStatus]
              }
            </dd>
          </div>
          <div>
            <dt>{uiText.text_5eb3967bfb0e}</dt>
            <dd>
              {
                {
                  NotRequested: uiText.text_b215b3cdccd3,
                  Pending: uiText.text_7f201a60b34b,
                  Processing: uiText.text_68bfe264e2cf,
                  Ready: uiText.text_376e9c9561e2,
                  Failed: uiText.text_bbd429973d6e,
                }[source.processingStatus]
              }
            </dd>
          </div>
          <div>
            <dt>{uiText.text_a7659ef6327d}</dt>
            <dd>{date(source.createdAtUtc)}</dd>
          </div>
          {source.file && (
            <div>
              <dt>{uiText.text_63298350bfb1}</dt>
              <dd dir="auto">{source.file.originalFileName}</dd>
            </div>
          )}
        </dl>
        {source.aiUnavailableReason && <p className={s.hint}>{uiText.text_059af5880dc1}</p>}
        {sourceDownloadable(source) && (
          <Button disabled={busy} onClick={() => void download()}>
            {uiText.text_195904575930}
          </Button>
        )}
        {source.scope === 'Library' && <p className={s.hint}>{uiText.text_70050e6de11c}</p>}
        <Button variant="outline" onClick={refresh}>
          {uiText.text_3ac20a5871e1}
        </Button>
      </section>
      {(source.capabilities.canWrite ||
        source.capabilities.canPublish ||
        source.capabilities.canArchive ||
        source.capabilities.canChangeVisibility) && (
        <section className={s.panel}>
          <h2>{uiText.text_8d637ce68405}</h2>
          {source.capabilities.canWrite && (
            <>
              <label className={s.field}>
                {uiText.text_4aed2158ed57}
                <input
                  value={title}
                  maxLength={200}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className={s.field}>
                {uiText.text_3fb8ed5c09ec}
                <textarea
                  value={description}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </>
          )}
          <label className={s.field}>
            {uiText.text_3e94e3d48de6}
            <input
              value={reason}
              maxLength={500}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {baseline.current !== source.version && (
            <p className={s.hint}>{uiText.text_8cd1e858041b}</p>
          )}
          {baseline.current !== source.version && (
            <Button
              variant="outline"
              onClick={() => {
                baseline.current = source.version;
                setSuccess(uiText.text_85d9aa97ab20);
              }}
            >
              {uiText.text_3e6fbac4aaf0}
            </Button>
          )}
          <div className={s.actions}>
            {source.capabilities.canWrite && (
              <Button
                disabled={
                  busy || !title.trim() || !reason.trim() || baseline.current !== source.version
                }
                onClick={() => void mutate('draft')}
              >
                {uiText.text_c7be60663550}
              </Button>
            )}
            {source.capabilities.canPublish && (
              <ConfirmAction
                disabled={busy || dirty || !reason.trim() || baseline.current !== source.version}
                trigger={uiText.text_e91f86d68e00}
                title={uiText.text_e91f86d68e00}
                description={uiText.text_fe1f0c9b6301}
                onConfirm={() => mutate('publish')}
              />
            )}
            {source.capabilities.canArchive && (
              <ConfirmAction
                destructive
                disabled={busy || dirty || !reason.trim() || baseline.current !== source.version}
                trigger={uiText.text_28962a621bca}
                title={uiText.text_28962a621bca}
                description={uiText.text_e5a46d20e71d}
                onConfirm={() => mutate('archive')}
              />
            )}
            {source.capabilities.canChangeVisibility && (
              <ConfirmAction
                disabled={busy || dirty || !reason.trim() || baseline.current !== source.version}
                trigger={
                  source.visibility === 'Public'
                    ? uiText.text_25634673d188
                    : uiText.text_113ab0e555a2
                }
                title={uiText.text_a1aa9c6ac26b}
                description={uiText.text_7c12d530db7d}
                onConfirm={() => mutate('visibility')}
              />
            )}
          </div>
        </section>
      )}
      {source.scope !== 'Library' && source.capabilities.canCreateVersion && (
        <SourceUpload
          key={source.sourceId}
          source={source}
          scope={source.scope}
          classId={source.classId}
          onSaved={(value) => void accept(value)}
        />
      )}
      {!!success && <p role="status">{success}</p>}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
