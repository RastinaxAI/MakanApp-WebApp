'use client';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import s from './school.module.css';
import { Card, Field, Pager, useSchoolCommand } from './shared';
type S = components['schemas'];

export function schoolQuery(page: number, search = '', extra: Record<string, string> = {}) {
  return new URLSearchParams({
    Page: String(page),
    PageSize: '30',
    ...(search.trim() ? { Search: search.trim() } : {}),
    ...extra,
  }).toString();
}
export function SchoolSearch({
  onSearch,
  label: title = 'جستجو',
  disabled = false,
  embedded = false,
}: {
  onSearch: (q: string) => void;
  label?: string;
  disabled?: boolean;
  embedded?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const search = () => {
    if (!disabled) onSearch(draft.trim());
  };
  const contents = (
    <>
      <input
        aria-label={title}
        disabled={disabled}
        maxLength={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (embedded && e.key === 'Enter') {
            e.preventDefault();
            search();
          }
        }}
        placeholder={title}
      />
      <Button
        type={embedded ? 'button' : 'submit'}
        variant="outline"
        disabled={disabled}
        onClick={embedded ? search : undefined}
      >
        جستجو
      </Button>
    </>
  );
  return embedded ? (
    <div className={s.toolbar}>{contents}</div>
  ) : (
    <form
      className={s.toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
    >
      {contents}
    </form>
  );
}
export function MemberPicker({
  role,
  value,
  onChange,
}: {
  role: 'Teacher' | 'Student';
  value: string;
  onChange: (member: S['SchoolMemberResult'] | null) => void;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const q = usePersonalApi<S['SchoolPageOfSchoolMemberResult']>(
    '/api/v1/organization/members?' + schoolQuery(page, search, { Role: role, Status: 'Active' }),
  );
  return (
    <>
      <SchoolSearch
        label={role === 'Teacher' ? 'جستجوی معلم آموزشگاه' : 'جستجوی دانش‌آموز آموزشگاه'}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
          onChange(null);
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Field label={role === 'Teacher' ? 'معلم آموزشگاه' : 'دانش‌آموز آموزشگاه'}>
            <select
              value={value}
              onChange={(e) =>
                onChange(q.data.items.find((x) => x.membershipId === e.target.value) ?? null)
              }
            >
              <option value="">انتخاب کنید…</option>
              {q.data.items.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.displayName}
                  {m.username ? ` (@${m.username})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={q.data.page}
            size={q.data.pageSize}
            total={q.data.totalCount}
            onChange={(p) => {
              setPage(p);
              onChange(null);
            }}
          />
        </>
      )}
    </>
  );
}
export function ClassRoster({
  classId,
  kind,
  manage = false,
}: {
  classId: string;
  kind: 'learners' | 'teachers';
  manage?: boolean;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const q = usePersonalApi<
    S['SchoolPageOfClassLearnerResult'] | S['SchoolPageOfClassTeacherResult']
  >(`/api/v1/academic/classes/${classId}/${kind}?` + schoolQuery(page, search));
  const command = useSchoolCommand();
  return (
    <Card title={kind === 'learners' ? 'فهرست دانش‌آموزان کلاس' : 'فهرست معلمان کلاس'}>
      <SchoolSearch
        label="جستجو در اعضای کلاس"
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={manage ? `${s.tableWrap} ${s.roster}` : s.tableWrap}>
              <table role="table" className={s.table}>
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader">نام</th>
                    <th role="columnheader">نام کاربری</th>
                    <th role="columnheader">وضعیت</th>
                    {manage && <th role="columnheader">عملیات</th>}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {q.data.items.map((m) => {
                    const learner = 'enrollmentId' in m;
                    const relationId = learner ? m.enrollmentId : m.teacherAssignmentId;
                    return (
                      <tr role="row" key={relationId}>
                        <td role="cell">{m.displayName}</td>
                        <td role="cell">
                          <bdi>{m.username ? '@' + m.username : '—'}</bdi>
                        </td>
                        <td role="cell">{label(m.status)}</td>
                        {manage && (
                          <td role="cell">
                            {m.status === 'Active' && (
                              <ConfirmAction
                                destructive
                                title={'حذف ' + m.displayName + ' از کلاس'}
                                trigger={'حذف از کلاس · ' + m.displayName}
                                confirm="حذف از این کلاس"
                                description={
                                  learner
                                    ? 'ثبت‌نام دانش‌آموز در همین کلاس پایان می‌یابد؛ حساب و سابقهٔ آموزشی حذف نمی‌شود.'
                                    : 'انتساب معلم به همین کلاس پایان می‌یابد. برای جایگزینی، معلم دیگری را جداگانه اضافه کنید.'
                                }
                                onConfirm={async () => {
                                  await command(
                                    `/api/v1/academic/classes/${classId}/${learner ? 'enrollments' : 'teachers'}/${relationId}/end`,
                                    learner ? { finalStatus: 'Withdrawn' } : undefined,
                                  );
                                  return true;
                                }}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="عضوی در این فهرست نیست" />
          )}
          <Pager
            page={q.data.page}
            size={q.data.pageSize}
            total={q.data.totalCount}
            onChange={setPage}
          />
        </>
      )}
    </Card>
  );
}
export function CatalogPicker({
  kind,
  value,
  onChange,
}: {
  kind: 'courses' | 'periods';
  value: string;
  onChange: (id: string) => void;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; title: string }>();
  const q = usePersonalApi<S['SchoolPageOfCourseResult'] | S['SchoolPageOfAcademicPeriodResult']>(
    `/api/v1/academic/${kind}?` + schoolQuery(page, search, { status: 'Active' }),
  );
  return (
    <>
      <SchoolSearch
        embedded
        label={kind === 'courses' ? 'جستجوی کاتالوگ درس‌ها' : 'جستجوی دوره‌های آموزشی'}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Field label={kind === 'courses' ? 'درس از کاتالوگ' : 'دوره از کاتالوگ'}>
            <select
              value={value}
              onChange={(e) => {
                setSelected(q.data.items.find((x) => x.id === e.target.value));
                onChange(e.target.value);
              }}
            >
              <option value="">انتخاب کنید یا مورد تازه بسازید…</option>
              {value && !q.data.items.some((i) => i.id === value) && (
                <option value={value}>
                  {selected?.id === value ? selected.title : 'مورد انتخاب‌شده'}
                </option>
              )}
              {q.data.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={q.data.page}
            size={q.data.pageSize}
            total={q.data.totalCount}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
