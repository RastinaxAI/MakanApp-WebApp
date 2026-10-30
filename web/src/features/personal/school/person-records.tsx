'use client';
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
      <section className={s.panel} aria-label="جستجوی پرونده‌های آموزشی">
        <SchoolSearch
          label="جستجوی پرونده‌ها"
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </section>
      <section className={s.panel} aria-label="فهرست پرونده‌ها">
        <header className={s.resultHeading}>
          <h2>پرونده‌های آموزشگاه</h2>
          {q.data && <span>{number(q.data.totalCount)} نتیجه</span>}
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
                      <th role="columnheader">نام فرد</th>
                      <th role="columnheader">وضعیت پرونده</th>
                      <th role="columnheader">اتصال حساب</th>
                      <th role="columnheader">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {q.data.items.map((record) => (
                      <tr role="row" key={record.id}>
                        <td role="cell">
                          <RecordIdentity
                            name={record.displayName || record.firstName + ' ' + record.lastName}
                            caption="پروندهٔ آموزشی"
                          />
                        </td>
                        <td role="cell" data-label="پرونده">
                          <StatusBadge value={record.status} />
                        </td>
                        <td role="cell" data-label="حساب">
                          <span className={s.muted}>
                            {record.isAccountLinked ? 'متصل' : 'متصل نشده'}
                          </span>
                        </td>
                        <td role="cell" className={s.actionCell}>
                          <Button asChild size="sm">
                            <Link
                              href={`${base}/people/${record.id}`}
                              aria-label={
                                'مشاهدهٔ پروندهٔ ' +
                                (record.displayName || record.firstName + ' ' + record.lastName)
                              }
                            >
                              <FolderOpen size={16} />
                              مشاهدهٔ پرونده
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="پرونده‌ای پیدا نشد"
                description="نام دیگری جستجو کنید یا پروندهٔ جدیدی ثبت کنید."
              />
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
      title={id ? 'ویرایش پرونده' : 'افزودن پرونده'}
      eyebrow="آموزشگاه / پرونده‌های آموزشی"
      back={id ? `${base}/people/${id}` : base + '/people'}
    >
      {id ? <ExistingPerson id={id} edit /> : <PersonEditor />}
    </WorkflowPage>
  );
}
export function PersonDetailPage({ id }: { id: string }) {
  return (
    <WorkflowPage
      title="جزئیات پرونده"
      eyebrow="آموزشگاه / پرونده‌های آموزشی"
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
          <p>پروندهٔ آموزشی در آموزشگاه فعال</p>
        </div>
        <StatusBadge value={record.status} />
        {record.canEditNames && (
          <Button asChild>
            <Link href={`${base}/people/${id}/edit`}>
              <Pencil size={17} />
              ویرایش پرونده
            </Link>
          </Button>
        )}
      </section>
      <div className={s.detailGrid}>
        <section className={s.panel}>
          <h2>
            <FileUser size={20} />
            مشخصات فردی
          </h2>
          <dl className={s.facts}>
            <div>
              <dt>نام</dt>
              <dd>{record.firstName}</dd>
            </div>
            <div>
              <dt>نام خانوادگی</dt>
              <dd>{record.lastName}</dd>
            </div>
            <div>
              <dt>نام نمایشی</dt>
              <dd>{record.displayName || 'ثبت نشده'}</dd>
            </div>
            <div>
              <dt>وضعیت پرونده</dt>
              <dd>
                <StatusBadge value={record.status} />
              </dd>
            </div>
          </dl>
        </section>
        <section className={s.panel}>
          <h2>{record.isAccountLinked ? <Link2 size={20} /> : <Unlink size={20} />}حساب کاربری</h2>
          <div className={s.accountState}>
            {record.isAccountLinked ? <Link2 size={20} /> : <Unlink size={20} />}
            <strong>{record.isAccountLinked ? 'حساب متصل است' : 'حساب متصل نشده'}</strong>
          </div>
          <p>
            {record.isAccountLinked
              ? 'این پرونده به یک حساب کاربری متصل است. نقش‌ها و ثبت‌نام کلاس جداگانه مدیریت می‌شوند.'
              : 'این پرونده اطلاعات آموزشی فرد را نگه می‌دارد؛ ساخت آن به‌تنهایی حساب کاربری یا نقش آموزشی ایجاد نمی‌کند.'}
          </p>
          {!record.canEditNames && <p>نام این پرونده در وضعیت فعلی قابل ویرایش نیست.</p>}
        </section>
      </div>
      <section className={s.panel}>
        <details className={s.identifiers}>
          <summary>شناسه‌های پرونده</summary>
          <dl className={s.facts}>
            <div>
              <dt>شناسهٔ پروندهٔ آموزشگاه</dt>
              <dd>
                <bdi>{record.id}</bdi>
              </dd>
            </div>
            <div>
              <dt>شناسهٔ شخص</dt>
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
      notice="پروندهٔ سازمانی، حساب جدید یا نقش آموزشی ایجاد نمی‌کند."
      rows={[
        ['نام', d.values.first],
        ['نام خانوادگی', d.values.last],
        ['نام نمایشی', d.values.display],
        ['دلیل', d.values.reason],
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
          مشخصات فردی
        </h2>
        <div className={s.formFields}>
          <Field label="نام">
            <input
              autoComplete="given-name"
              required
              value={d.values.first}
              onChange={(e) => d.set('first', e.target.value)}
            />
          </Field>
          <Field label="نام خانوادگی">
            <input
              autoComplete="family-name"
              required
              value={d.values.last}
              onChange={(e) => d.set('last', e.target.value)}
            />
          </Field>
          <Field label="نام نمایشی (اختیاری)">
            <input
              value={d.values.display}
              onChange={(e) => d.set('display', e.target.value)}
              placeholder="نامی که در آموزشگاه نمایش داده می‌شود"
            />
          </Field>
        </div>
      </section>
      <section className={s.formGroup}>
        <h2>
          <ClipboardList size={20} />
          توضیح ثبت
        </h2>
        <p>دلیل ثبت یا اصلاح اطلاعات را کوتاه بنویسید.</p>
        <Field label="دلیل ثبت یا تغییر پرونده">
          <textarea
            required
            value={d.values.reason}
            onChange={(e) => d.set('reason', e.target.value)}
            placeholder="برای مثال: اصلاح نام ثبت‌شده در پرونده"
          />
        </Field>
      </section>
    </WorkflowForm>
  );
}
