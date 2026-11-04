'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CircleUserRound,
  FileUser,
  Link2,
  Unlink,
  Pencil,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { base, Field, Pager, useSchoolAction } from './shared';
import { SchoolSearch } from './directory';
import { WorkflowForm, WorkflowPage, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { DirectoryHeader, RecordIdentity } from './directory-view';
import s from './people.module.css';
type S = components['schemas'];

export function People() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    '/api/v1/organization/people?' +
      new URLSearchParams({ page: String(page), pageSize: '30', ...(search ? { search } : {}) }),
  );
  return (
    <div className={s.page}>
      <DirectoryHeader records />
      <section className={s.panel} aria-label={uiText.text_e4b1c0f12b56}>
        <SchoolSearch
          label={uiText.text_e52c421dff2c}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </section>
      <section className={s.panel} aria-label={uiText.text_2b7ab2fd590c}>
        <header className={s.resultHeading}>
          <h2>{uiText.text_761e229676b7}</h2>
          {q.data && (
            <span>
              {number(q.data.totalCount)}
              {uiText.text_028c8faf7935}
            </span>
          )}
        </header>
        {q.isPending ? (
          <LoadingSkeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            {q.data.items.length ? (
              <div className={s.tableWrap}>
                <table role="table" className={s.table}>
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader">{uiText.text_5e535aba42de}</th>
                      <th role="columnheader">{uiText.text_dd1b208f270b}</th>
                      <th role="columnheader">{uiText.text_8ca78e1b4814}</th>
                      <th role="columnheader">{uiText.text_35c2efc6a99d}</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {q.data.items.map((record) => (
                      <tr role="row" key={record.id}>
                        <td role="cell">
                          <RecordIdentity
                            name={record.displayName || record.firstName + ' ' + record.lastName}
                            caption={uiText.text_5d33f6812cd4}
                          />
                        </td>
                        <td role="cell" data-label={uiText.text_68d976ba9e81}>
                          <StatusBadge value={record.status} />
                        </td>
                        <td role="cell" data-label={uiText.text_c28daebcd3bf}>
                          <span className={s.muted}>
                            {record.isAccountLinked
                              ? uiText.text_490a4c57bf7a
                              : uiText.text_33547bc78c38}
                          </span>
                        </td>
                        <td role="cell" className={s.actionCell}>
                          <Button asChild size="sm">
                            <Link
                              href={`${base}/people/${record.id}`}
                              aria-label={
                                uiText.text_cefa283cd307 +
                                (record.displayName || record.firstName + ' ' + record.lastName)
                              }
                            >
                              <FolderOpen size={16} />
                              {uiText.text_895400e35aa6}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title={uiText.text_c49da5be84b7} description={uiText.text_d22a20b5f223} />
            )}
            <Pager
              page={q.data.page}
              size={q.data.pageSize}
              total={q.data.totalCount}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
export function PersonFormPage({ id }: { id?: string }) {
  return (
    <WorkflowPage
      title={id ? uiText.text_5fe4a18d76e9 : uiText.text_68c9cbc200a9}
      eyebrow={uiText.text_09de2f309ec3}
      back={id ? `${base}/people/${id}` : base + '/people'}
    >
      {id ? <ExistingPerson id={id} edit /> : <PersonEditor />}
    </WorkflowPage>
  );
}
export function PersonDetailPage({ id }: { id: string }) {
  return (
    <WorkflowPage
      title={uiText.text_520b2ae78d67}
      eyebrow={uiText.text_09de2f309ec3}
      back={base + '/people'}
    >
      <ExistingPerson id={id} />
    </WorkflowPage>
  );
}
function ExistingPerson({ id, edit = false }: { id: string; edit?: boolean }) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['OrganizationPersonDto']>(`${'/api/v1/organization/people/'}${id}`);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.id !== id)
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  if (q.data.organizationId !== session.context.organizationId)
    return <ErrorState error={new ApiError(403)} />;
  if (edit)
    return q.data.canEditNames ? (
      <PersonEditor original={q.data} />
    ) : (
      <ErrorState error={new ApiError(403)} />
    );
  const record = q.data,
    name = record.displayName || record.firstName + ' ' + record.lastName;
  return (
    <div className={s.page}>
      <section className={s.recordHero}>
        <span className={s.avatar} aria-hidden="true">
          <CircleUserRound size={32} />
        </span>
        <div>
          <h2>{name}</h2>
          <p>{uiText.text_803b2a679970}</p>
        </div>
        <StatusBadge value={record.status} />
        {record.canEditNames && (
          <Button asChild>
            <Link href={`${base}/people/${id}/edit`}>
              <Pencil size={17} />
              {uiText.text_5fe4a18d76e9}
            </Link>
          </Button>
        )}
      </section>
      <div className={s.detailGrid}>
        <section className={s.panel}>
          <h2>
            <FileUser size={20} />
            {uiText.text_61d235c5d463}
          </h2>
          <dl className={s.facts}>
            <div>
              <dt>{uiText.text_69c1e5b1fe20}</dt>
              <dd>{record.firstName}</dd>
            </div>
            <div>
              <dt>{uiText.text_3fe7ba4a2131}</dt>
              <dd>{record.lastName}</dd>
            </div>
            <div>
              <dt>{uiText.text_5903c1c121cb}</dt>
              <dd>{record.displayName || uiText.text_5749a86140fa}</dd>
            </div>
            <div>
              <dt>{uiText.text_dd1b208f270b}</dt>
              <dd>
                <StatusBadge value={record.status} />
              </dd>
            </div>
          </dl>
        </section>
        <section className={s.panel}>
          <h2>
            {record.isAccountLinked ? <Link2 size={20} /> : <Unlink size={20} />}
            {uiText.text_7ff9b551cfbc}
          </h2>
          <div className={s.accountState}>
            {record.isAccountLinked ? <Link2 size={20} /> : <Unlink size={20} />}
            <strong>
              {record.isAccountLinked ? uiText.text_76e5a8315199 : uiText.text_86c185646c12}
            </strong>
          </div>
          <p>{record.isAccountLinked ? uiText.text_53437dbf427f : uiText.text_808e1b11e334}</p>
          {!record.canEditNames && <p>{uiText.text_678da4712ae9}</p>}
        </section>
      </div>
      <section className={s.panel}>
        <details className={s.identifiers}>
          <summary>{uiText.text_1a4e5a33c6e7}</summary>
          <dl className={s.facts}>
            <div>
              <dt>{uiText.text_9adbdd5ac00c}</dt>
              <dd>
                <bdi>{record.id}</bdi>
              </dd>
            </div>
            <div>
              <dt>{uiText.text_53c9bf7c39f9}</dt>
              <dd>
                <bdi>{record.personId}</bdi>
              </dd>
            </div>
          </dl>
        </details>
      </section>
    </div>
  );
}

function PersonEditor({ original }: { original?: S['OrganizationPersonDto'] }) {
  const d = useWorkflowDraft(
      'person:' + (original?.id ?? 'new'),
      {
        first: original?.firstName ?? '',
        last: original?.lastName ?? '',
        display: original?.displayName ?? '',
        reason: '',
        operation: crypto.randomUUID(),
      },
      original?.rowVersion ?? 'new',
    ),
    a = useSchoolAction(),
    router = useRouter();
  const valid =
    !!d.values.first.trim() && !!d.values.last.trim() && !!d.values.reason.trim() && !d.stale;
  return (
    <WorkflowForm
      ready={d.ready && !d.stale}
      canCommit={valid}
      busy={a.busy}
      notice={uiText.text_ac610f52cfdf}
      rows={[
        [uiText.text_69c1e5b1fe20, d.values.first],
        [uiText.text_3fe7ba4a2131, d.values.last],
        [uiText.text_5903c1c121cb, d.values.display],
        [uiText.text_ecaf3518c67b, d.values.reason],
      ]}
      error={
        <>
          {a.feedback}
          <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['OrganizationPersonDto']>(
          '/api/v1/organization/people' + (original ? '/' + original.id : ''),
          {
            firstName: d.values.first.trim(),
            lastName: d.values.last.trim(),
            displayName: d.values.display.trim() || null,
            reason: d.values.reason.trim(),
            ...(original
              ? {
                  expectedRowVersion: d.baseVersion,
                  expectedPersonRowVersion: original.personRowVersion,
                }
              : { clientOperationId: d.values.operation }),
          },
          original ? 'PATCH' : 'POST',
        );
        if (result) {
          d.reset();
          router.replace(`${base}/people/${result.id}`);
        }
      }}
    >
      <section className={s.formGroup}>
        <h2>
          <FileUser size={20} />
          {uiText.text_61d235c5d463}
        </h2>
        <div className={s.formFields}>
          <Field label={uiText.text_69c1e5b1fe20}>
            <input
              autoComplete="given-name"
              required
              value={d.values.first}
              onChange={(e) => d.set('first', e.target.value)}
            />
          </Field>
          <Field label={uiText.text_3fe7ba4a2131}>
            <input
              autoComplete="family-name"
              required
              value={d.values.last}
              onChange={(e) => d.set('last', e.target.value)}
            />
          </Field>
          <Field label={uiText.text_0c372fe12c90}>
            <input
              value={d.values.display}
              onChange={(e) => d.set('display', e.target.value)}
              placeholder={uiText.text_97098199cc52}
            />
          </Field>
        </div>
      </section>
      <section className={s.formGroup}>
        <h2>
          <ClipboardList size={20} />
          {uiText.text_2979f12cb485}
        </h2>
        <p>{uiText.text_d38f60c41090}</p>
        <Field label={uiText.text_e3f9741e73bf}>
          <textarea
            required
            value={d.values.reason}
            onChange={(e) => d.set('reason', e.target.value)}
            placeholder={uiText.text_c02ab0f896b2}
          />
        </Field>
      </section>
    </WorkflowForm>
  );
}
