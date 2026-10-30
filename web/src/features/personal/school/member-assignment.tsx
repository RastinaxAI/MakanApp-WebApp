'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState, LoadingSkeleton } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { usePersonal, usePersonalApi } from '../provider';
import { schoolQuery, SchoolSearch } from './directory';
import { Field, Pager } from './shared';
import s from './member-assignment.module.css';
type S = components['schemas'];
type Pick = {
  id: string;
  name: string;
  state: 'selected' | 'sending' | 'done' | 'error';
  error?: unknown;
};
export function ClassMemberAssignment({
  classId,
  kind,
}: {
  classId: string;
  kind: 'teachers' | 'learners';
}) {
  const teacher = kind === 'teachers',
    { session, call } = usePersonal(),
    cache = useQueryClient();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [source, setSource] = useState('members');
  const [selected, setSelected] = useState<Record<string, Pick>>({}),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const members = usePersonalApi<S['SchoolPageOfSchoolMemberResult']>(
    '/api/v1/organization/members?' +
      schoolQuery(page, search, { Role: teacher ? 'Teacher' : 'Student', Status: 'Active' }),
    { enabled: source === 'members' },
  );
  const people = usePersonalApi<S['OrganizationPeoplePage']>(
    `/api/v1/organization/people?page=${page}&pageSize=30&search=${encodeURIComponent(search)}`,
    { enabled: source === 'records' },
  );
  const q = source === 'records' ? people : members;
  const candidates =
    source === 'records'
      ? (people.data?.items.map((p) => ({
          id: p.id,
          name: p.displayName || p.firstName + ' ' + p.lastName,
          disabled: p.status !== 'Active',
        })) ?? [])
      : (members.data?.items.map((m) => ({
          id: teacher ? m.membershipId : m.organizationPersonId,
          name: m.displayName,
          disabled:
            m.membershipStatus !== 'Active' ||
            !m.activeRoles.includes(teacher ? 'Teacher' : 'Student') ||
            (!teacher && !m.organizationPersonId),
        })) ?? []);
  const choices = Object.values(selected),
    pending = choices.filter((p) => p.state !== 'done');
  useUnsavedChanges(busy || pending.length > 0);
  const update = (pick: Pick) => {
    if (alive.current) setSelected((old) => ({ ...old, [pick.id]: pick }));
  };
  async function alreadyActive(targetId: string) {
    for (let p = 1; ; p++) {
      const rows = await call<
        S['SchoolPageOfClassTeacherResult'] | S['SchoolPageOfClassLearnerResult']
      >(`/api/v1/academic/classes/${classId}/${kind}?` + schoolQuery(p));
      if (
        rows.items.some(
          (r) =>
            r.status === 'Active' &&
            ('teacherMembershipId' in r ? r.teacherMembershipId : r.learnerOrganizationPersonId) ===
              targetId,
        )
      )
        return true;
      if (rows.page * rows.pageSize >= rows.totalCount) return false;
    }
  }
  async function submit() {
    if (lock.current || !pending.length) return;
    lock.current = true;
    setBusy(true);
    try {
      for (const pick of pending) {
        if (!alive.current) break;
        update({ ...pick, state: 'sending', error: undefined });
        try {
          // A failed response may have applied. Reconcile before manually retrying.
          if (pick.state === 'error' && (await alreadyActive(pick.id))) {
            update({ ...pick, state: 'done', error: undefined });
            continue;
          }
          await call(
            `/api/v1/academic/classes/${classId}/${teacher ? 'teachers' : 'enrollments'}`,
            {
              method: 'POST',
              body: JSON.stringify(
                teacher
                  ? { teacherMembershipId: pick.id }
                  : { learnerOrganizationPersonId: pick.id },
              ),
            },
          );
          update({ ...pick, state: 'done', error: undefined });
        } catch (error) {
          update({ ...pick, state: 'error', error });
          if (error instanceof ApiError && [401, 403, 409].includes(error.status)) break;
        }
      }
      if (alive.current)
        await cache.invalidateQueries({
          queryKey: ['personal', session.user.id, session.revision],
        });
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className={s.layout}>
      <section className={s.selection}>
        <h2>{teacher ? 'انتخاب معلمان' : 'انتخاب دانش‌آموزان'}</h2>
        <p>چند نفر را انتخاب کنید؛ انتخاب‌های شما هنگام جستجو و تغییر صفحه باقی می‌مانند.</p>
        {!teacher && (
          <Field label="روش انتخاب دانش‌آموز">
            <select
              disabled={busy}
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
                setSearch('');
              }}
            >
              <option value="members">دانش‌آموزان عضو آموزشگاه</option>
              <option value="records">از پرونده‌های آموزشی</option>
            </select>
          </Field>
        )}
        <SchoolSearch
          key={source}
          label={teacher ? 'جستجوی معلمان برای افزودن' : 'جستجوی دانش‌آموزان برای افزودن'}
          disabled={busy}
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
            {candidates.length ? (
              <ul className={s.list}>
                {candidates.map((p, i) => (
                  <li key={p.id ?? i}>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={'انتخاب ' + p.name}
                        disabled={
                          busy || p.disabled || !!(p.id && selected[p.id]?.state === 'done')
                        }
                        checked={!!(p.id && selected[p.id])}
                        onChange={(e) => {
                          if (!p.id) return;
                          const id = p.id;
                          if (e.target.checked) update({ id, name: p.name, state: 'selected' });
                          else
                            setSelected((old) => {
                              const next = { ...old };
                              delete next[id];
                              return next;
                            });
                        }}
                      />
                      <span>
                        <strong>{p.name}</strong>
                        {p.disabled && (
                          <small>پرونده یا عضویت فعال برای این انتخاب موجود نیست</small>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="فردی با این شرایط پیدا نشد" />
            )}
            <Pager
              page={page}
              total={q.data!.totalCount}
              size={q.data!.pageSize}
              onChange={(v) => {
                if (!busy) setPage(v);
              }}
            />
          </>
        )}
      </section>
      <aside className={s.summary} aria-label="انتخاب‌ها و نتیجهٔ افزودن">
        <h2>{choices.length.toLocaleString('fa-IR')} نفر انتخاب‌شده</h2>
        <p>افزودن هر نفر جدا انجام می‌شود؛ خطای یک نفر، موفقیت دیگران را برنمی‌گرداند.</p>
        {choices.map((p) => (
          <div className={s.result} key={p.id}>
            <strong>{p.name}</strong>
            <span role="status">
              {p.state === 'done'
                ? 'به کلاس اضافه شد'
                : p.state === 'sending'
                  ? 'در حال ثبت…'
                  : p.state === 'error'
                    ? 'ثبت تأیید نشد؛ وضعیت را بررسی کنید'
                    : 'آمادهٔ افزودن'}
            </span>
            {p.state === 'error' && <ErrorState error={p.error} />}
          </div>
        ))}
        <Button disabled={busy || !pending.length} onClick={() => void submit()}>
          {busy
            ? 'در حال افزودن…'
            : pending.some((p) => p.state === 'error')
              ? 'بررسی و تلاش دوباره'
              : 'افزودن ' + pending.length.toLocaleString('fa-IR') + ' نفر به کلاس'}
        </Button>
      </aside>
    </div>
  );
}
