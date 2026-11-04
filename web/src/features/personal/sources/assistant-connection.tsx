'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { preflightMessage, sourceAiSelectable } from './model';
type S = components['schemas'];
type Selected = { id: string; title: string };
export function AssistantSourceConnection({
  initialSelected = [],
  initialItems = [],
  onSelectionChange,
}: {
  initialSelected?: string[];
  initialItems?: Selected[];
  onSelectionChange?: (items: Selected[]) => void;
} = {}) {
  const { call, session } = usePersonal();
  const [scope, setScope] = useState<'Personal' | 'Class' | 'Library'>('Personal'),
    [classId, setClass] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Selected[]>(() =>
    initialSelected.map(
      (id) =>
        initialItems.find((item) => item.id === id) ?? { id, title: uiText.text_2a1922f9e184 },
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [result, setResult] = useState<S['AiSourcePreflightResult']>();
  const school =
    session.context.workspaceType === 'Organization' &&
    ['Student', 'Teacher', 'Manager'].includes(session.context.activeRole ?? '');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: scope === 'Class' && school,
  });
  const params = new URLSearchParams({ Scope: scope, Page: String(page), PageSize: '20' });
  if (search) params.set('Search', search);
  if (scope === 'Class' && classId) params.set('ClassId', classId);
  const q = usePersonalApi<S['SourcePage']>('/api/v1/sources?' + params, {
    enabled: scope !== 'Class' || (school && !!classId),
  });
  const lock = useRef(false),
    callback = useRef(onSelectionChange);
  callback.current = onSelectionChange;
  useEffect(() => callback.current?.(selected), [selected]);
  // A refreshed authoritative row can revoke a selection. Unseen pages are not treated as revoked.
  useEffect(() => {
    if (!q.data) return;
    const denied = new Set(
      q.data.items.filter((item) => !sourceAiSelectable(item)).map((item) => item.sourceId),
    );
    setSelected((old) =>
      old.some((item) => denied.has(item.id)) ? old.filter((item) => !denied.has(item.id)) : old,
    );
  }, [q.data]);
  async function check() {
    if (lock.current || !selected.length) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      setResult(
        await call<S['AiSourcePreflightResult']>('/api/v1/ai/sources/preflight', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'Chat',
            selectedSourceIds: selected.map((item) => item.id),
          }),
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="mk-ui mk-source-picker" aria-label={uiText.text_a5a599a4d5ad}>
      <label className="search">
        <Search size={19} />
        <input
          aria-label={uiText.text_032399b8b323}
          placeholder={uiText.text_032399b8b323}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <div className="seg" role="group" aria-label={uiText.text_1592fbd1126a}>
        {(
          [
            ['Personal', uiText.text_8957887c2b2f],
            ['Class', uiText.text_e7b1ccd0bda3],
            ['Library', uiText.text_8dfd6e9f41b6],
          ] as const
        ).map(([key, title]) => (
          <button
            type="button"
            className={scope === key ? 'on' : ''}
            key={key}
            onClick={() => {
              setScope(key);
              setPage(1);
              setResult(undefined);
            }}
          >
            {title}
          </button>
        ))}
      </div>
      {scope === 'Class' &&
        (!school ? (
          <EmptyState title={uiText.text_cfc8c7effeea} description={uiText.text_859153655434} />
        ) : classes.isPending ? (
          <LoadingSkeleton />
        ) : classes.isError ? (
          <ErrorState error={classes.error} />
        ) : (
          <label className="field">
            {uiText.text_f6eddb045e16}
            <select
              value={classId}
              onChange={(event) => {
                setClass(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{uiText.text_28867895dae8}</option>
              {classes.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        ))}
      {scope === 'Library' && <p className="alert warn">{uiText.text_4d31b36f9183}</p>}
      {scope === 'Class' && (!school || !classId) ? null : q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <EmptyState title={search ? uiText.text_76263ba743f2 : uiText.text_09fcb17b9340} />
      ) : (
        <>
          <div className="list">
            {q.data.items.map((source) => (
              <label key={source.sourceId} className="row">
                <span className="tile-icon">
                  <FileText size={22} />
                </span>
                <span className="grow">
                  <h4 dir="auto">{source.title}</h4>
                  <p>
                    {sourceAiSelectable(source)
                      ? uiText.text_88d60d5cccab
                      : !source.capabilities.canUseForAi
                        ? uiText.text_3fac9717ba13
                        : uiText.text_5d73644e7bf2}
                  </p>
                  <p>
                    {uiText.text_d2aa095f1567}
                    {source.fileReady ? uiText.text_376e9c9561e2 : uiText.text_caac18ea6580}
                    {uiText.text_db07d8f0bcb8}{' '}
                    {source.sourceReady ? uiText.text_376e9c9561e2 : uiText.text_caac18ea6580}
                    {uiText.text_9d02ca20e666}{' '}
                    {source.aiReady ? uiText.text_376e9c9561e2 : uiText.text_caac18ea6580}
                  </p>
                </span>
                <input
                  type="checkbox"
                  aria-label={uiText.text_390a9cb6ef20 + source.title}
                  checked={
                    selected.some((item) => item.id === source.sourceId) &&
                    sourceAiSelectable(source)
                  }
                  disabled={busy || !sourceAiSelectable(source)}
                  onChange={(event) => {
                    setSelected((old) =>
                      event.target.checked
                        ? [...old, { id: source.sourceId, title: source.title }]
                        : old.filter((item) => item.id !== source.sourceId),
                    );
                    setResult(undefined);
                  }}
                />
              </label>
            ))}
          </div>
          <div className="between">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {uiText.text_88e65319d694}
            </Button>
            <span className="tiny muted">
              {uiText.text_2714496eef16}
              {page.toLocaleString('fa-IR')}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page * q.data.pageSize >= q.data.totalCount}
              onClick={() => setPage(page + 1)}
            >
              {uiText.text_12ca1a58c6ca}
            </Button>
          </div>
        </>
      )}
      <div className="alert good">
        {selected.length.toLocaleString('fa-IR')}
        {uiText.text_aaa93351b89c}
      </div>
      <Button disabled={busy || !selected.length} onClick={() => void check()}>
        {busy ? uiText.text_25384e522776 : uiText.text_5cb53aa67331}
      </Button>
      {result && <p role="status">{preflightMessage(result)}</p>}
      {!!error && <ErrorState error={error} />}
      <Link className="text-action" href="/personal/resources">
        {uiText.text_bb441d2b8688}
      </Link>
    </section>
  );
}
