'use client';
import { useState } from 'react';
import Link from 'next/link';
import { integration80c as t } from '@/content/fa';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { usePersonalApi } from '@/features/personal/provider';
import { Field, Pager } from '@/features/personal/school/shared';
import { date } from '@/lib/formatting';
import { useClassCommand } from './use-class-command';
import {
  classBase as base,
  requestApi as api,
  stateLabel,
  validRequest,
  type S,
} from './api-model';
import { StaticConnectedFrame } from './frame';

export function FormationList() {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState('');
  const q = usePersonalApi<S['PersonalClassPageOfPersonalClassRequestDto']>(
    `${api}?page=${page}&pageSize=30${status ? '&status=' + status : ''}`,
    { poll: 15000 },
  );
  return (
    <StaticConnectedFrame id="MK-12" title={t.requests}>
      <Field label={t.status}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t.all}</option>
          {[
            'Draft',
            'Submitted',
            'UnderReview',
            'NeedsChanges',
            'Approved',
            'Rejected',
            'Cancelled',
          ].map((s) => (
            <option key={s} value={s}>
              {stateLabel(s)}
            </option>
          ))}
        </select>
      </Field>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {!q.data.items.length && <EmptyState title={t.noRequests} />}
          {q.data.items.map((r) => (
            <Link className="card" key={r.id} href={`${base}/requests/${r.id}`}>
              <span className="badge">{stateLabel(r.status)}</span>
              <h3>{r.details.title}</h3>
              <p>{r.details.purpose}</p>
              <small>{date(r.createdAtUtc, true)}</small>
            </Link>
          ))}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
      <Link className="btn" href={`${base}/requests/new`}>
        {t.requests}
      </Link>
    </StaticConnectedFrame>
  );
}
export function FormationDetail({ id, editing }: { id: string; editing?: boolean }) {
  const q = usePersonalApi<S['PersonalClassRequestDto']>(api + '/' + id, {
    poll: editing ? undefined : 5000,
  });
  const [page, setPage] = useState(1);
  const history = usePersonalApi<S['PersonalClassPageOfPersonalClassDecisionDto']>(
    `${api}/${id}/history?page=${page}&pageSize=30`,
  );
  const command = useClassCommand('request:' + id);
  return (
    <StaticConnectedFrame
      id="MK-18"
      back={base + '/requests'}
      title={q.data?.details.title ?? t.requests}
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className="card">
            <span className="badge">{stateLabel(q.data.status)}</span>
            <p>{q.data.details.purpose}</p>
            <p>{q.data.details.description}</p>
            {q.data.decisionReason && <p>{q.data.decisionReason}</p>}
            <p>
              {t.capacity}: {q.data.details.suggestedCapacity.toLocaleString('fa-IR')}
            </p>
            {q.data.createdClassId && (
              <Link className="btn secondary" href={`${base}/classes/${q.data.createdClassId}`}>
                {t.created}
              </Link>
            )}
            {q.data.progress && (
              <dl>
                {Object.entries(q.data.progress).map(([key, value]) => (
                  <div className="kv" key={key}>
                    <dt>
                      {
                        (
                          {
                            classState: t.status,
                            managerAccepted: t.managerAccepted,
                            groupState: t.group,
                            channelState: t.channel,
                          } as Record<string, string>
                        )[key]
                      }
                    </dt>
                    <dd>
                      {typeof value === 'boolean'
                        ? value
                          ? t.yes
                          : t.no
                        : stateLabel(String(value))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {q.data.capabilities.canEdit &&
            (editing ? (
              <RequestEdit value={q.data} />
            ) : (
              <Link className="btn secondary" href={`${base}/requests/${id}/edit`}>
                {t.edit}
              </Link>
            ))}
          {q.data.capabilities.canSubmit && (
            <ConfirmAction
              title={t.submit}
              trigger={t.submit}
              description={t.formationHint}
              onConfirm={async () =>
                !!(await command.run(`${api}/${id}/submit`, { expectedVersion: q.data.version }))
              }
            />
          )}
          {q.data.capabilities.canCancel && (
            <ConfirmAction
              title={t.cancel}
              trigger={t.cancel}
              description={t.formationHint}
              onConfirm={async () =>
                !!(await command.run(`${api}/${id}/cancel`, { expectedVersion: q.data.version }))
              }
            />
          )}
          <Button variant="outline" onClick={() => void q.refetch()}>
            {t.refresh}
          </Button>
          {command.feedback}
        </>
      )}
      <section className="card">
        <h3>{t.history}</h3>
        {history.isPending ? (
          <LoadingSkeleton />
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : (
          <>
            {history.data.items.map((item) => (
              <div className="row" key={item.id}>
                <div>
                  <p>{stateLabel(item.action)}</p>
                  <p>{item.reason}</p>
                  <small>{date(item.occurredAtUtc, true)}</small>
                </div>
              </div>
            ))}
            <Pager page={page} total={history.data.totalCount} onChange={setPage} />
          </>
        )}
      </section>
    </StaticConnectedFrame>
  );
}
function RequestEdit({ value }: { value: S['PersonalClassRequestDto'] }) {
  const [details, setDetails] = useState(value.details),
    [version, setVersion] = useState(value.version);
  const command = useClassCommand('edit-request:' + value.id);
  const stale = version !== value.version;
  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (stale || !validRequest(details)) return;
        const result = await command.run<S['PersonalClassRequestDto']>(
          `${api}/${value.id}`,
          { expectedVersion: version, details },
          { method: 'PUT' },
        );
        if (result) setVersion(result.value.version);
      }}
    >
      <Field label={t.title}>
        <input
          required
          maxLength={200}
          value={details.title}
          onChange={(e) => setDetails({ ...details, title: e.target.value })}
        />
      </Field>
      <Field label={t.purpose}>
        <textarea
          required
          maxLength={2000}
          value={details.purpose}
          onChange={(e) => setDetails({ ...details, purpose: e.target.value })}
        />
      </Field>
      <Field label={t.description}>
        <textarea
          maxLength={4000}
          value={details.description ?? ''}
          onChange={(e) => setDetails({ ...details, description: e.target.value || null })}
        />
      </Field>
      <Field label={t.capacity}>
        <input
          type="number"
          required
          min={1}
          value={details.suggestedCapacity}
          onChange={(e) => setDetails({ ...details, suggestedCapacity: Number(e.target.value) })}
        />
      </Field>
      {stale && (
        <>
          <p role="alert">{t.versionConflict}</p>
          <Button type="button" variant="outline" onClick={() => setVersion(value.version)}>
            {t.refresh}
          </Button>
        </>
      )}
      <Button disabled={command.busy || stale || !validRequest(details)}>{t.save}</Button>
      {command.feedback}
    </form>
  );
}
