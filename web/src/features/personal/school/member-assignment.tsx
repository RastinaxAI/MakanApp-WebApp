'use client';
import * as uiText from '@/content/fa';
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
        <h2>{teacher ? uiText.text_988a9f3a30f5 : uiText.text_e66b1190c86c}</h2>
        <p>{uiText.text_e00915ec36cf}</p>
        {!teacher && (
          <Field label={uiText.text_b4adb9469c50}>
            <select
              disabled={busy}
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
                setSearch('');
              }}
            >
              <option value="members">{uiText.text_e896842afe7b}</option>
              <option value="records">{uiText.text_e40bbfa529e7}</option>
            </select>
          </Field>
        )}
        <SchoolSearch
          key={source}
          label={teacher ? uiText.text_120de68a4876 : uiText.text_65ede2372929}
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
                        aria-label={uiText.text_89e9053371c8 + p.name}
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
                        {p.disabled && <small>{uiText.text_b3d6c9493f41}</small>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={uiText.text_a7752b98a99b} />
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
      <aside className={s.summary} aria-label={uiText.text_e6abca191b09}>
        <h2>
          {choices.length.toLocaleString('fa-IR')}
          {uiText.text_cd049afa6984}
        </h2>
        <p>{uiText.text_2747228563a9}</p>
        {choices.map((p) => (
          <div className={s.result} key={p.id}>
            <strong>{p.name}</strong>
            <span role="status">
              {p.state === 'done'
                ? uiText.text_26906f613c15
                : p.state === 'sending'
                  ? uiText.text_b5ef00b1806f
                  : p.state === 'error'
                    ? uiText.text_a9562ef9a9c5
                    : uiText.text_d8d6fdf5ca72}
            </span>
            {p.state === 'error' && <ErrorState error={p.error} />}
          </div>
        ))}
        <Button disabled={busy || !pending.length} onClick={() => void submit()}>
          {busy
            ? uiText.text_b48606a1eeac
            : pending.some((p) => p.state === 'error')
              ? uiText.text_895f00b2273b
              : uiText.text_dc08253feac0 +
                pending.length.toLocaleString('fa-IR') +
                uiText.text_a91a0317a5d6}
        </Button>
      </aside>
    </div>
  );
}
