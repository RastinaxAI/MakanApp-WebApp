'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, ClipboardList, FileQuestion, Search } from 'lucide-react';
import { usePersonal } from '../provider';
import { Card, Field, SchoolHeading } from './shared';
import { filterSchoolSearch, mapSchoolSearch, type SchoolSearchItem } from './search-model';
import s from './school.module.css';
type S = components['schemas'];
const labels = {
  all: uiText.text_15270886eadd,
  classes: uiText.text_e7b1ccd0bda3,
  assignments: uiText.text_e8fed4d47d62,
  exams: uiText.text_4f7293cf5780,
};
export function SchoolSearch() {
  const { session, call } = usePersonal(),
    router = useRouter(),
    params = useSearchParams();
  const query = params.get('q')?.trim() ?? '',
    type = params.get('type') ?? 'all';
  const [draft, setDraft] = useState(query);
  const q = useQuery({
    queryKey: ['personal', session.user.id, session.revision, 'school-search', query],
    enabled: query.length >= 2,
    queryFn: async ({ signal }) => {
      const items: SchoolSearchItem[] = [],
        issues: string[] = [];
      if (session.context.activeRole === 'Parent') {
        const d = await call<S['ParentDashboardDto']>('/api/v1/dashboards/parent', { signal });
        if (
          d.organizationId !== session.context.organizationId ||
          !d.selectedLearner ||
          d.selectedLearner.learnerOrganizationPersonId !==
            session.context.subjectOrganizationPersonId
        )
          throw new ApiError(403);
        for (const a of d.assignments)
          items.push({
            id: a.assignmentId,
            type: 'assignments',
            title: a.title,
            detail: a.classTitle,
            href: '/personal/education/assignments',
          });
        for (const e of d.exams)
          items.push({
            id: e.examId,
            type: 'exams',
            title: e.title,
            detail: e.classTitle,
            href: '/personal/education/exams',
          });
        for (const item of [...d.assignments, ...d.exams])
          if (!items.some((row) => row.type === 'classes' && row.id === item.classId))
            items.push({
              id: item.classId,
              type: 'classes',
              title: item.classTitle,
              detail: d.selectedLearner.displayName,
              href: '/personal/education',
            });
        return { items, issues, parent: true };
      }
      const classes = await call<S['ClassResult'][]>('/api/v1/academic/classes', { signal });
      const valid = classes.filter((c) => c.organizationId === session.context.organizationId);
      for (const c of valid)
        items.push({
          id: c.id,
          type: 'classes',
          title: c.title,
          detail: c.courseTitle + ' ' + c.academicPeriodTitle,
          href: '/personal/education/classes/' + c.id,
        });
      const results = await mapSchoolSearch(valid, signal, async (c) => {
        try {
          return await call<S['AssignmentResult'][]>(
            `/api/v1/academic/classes/${c.id}/assignments`,
            { signal },
          );
        } catch (error) {
          signal.throwIfAborted();
          if (error instanceof ApiError && [401, 403, 409].includes(error.status)) throw error;
          issues.push(uiText.text_c3f4bea9320d + c.title);
          return [];
        }
      });
      for (const rows of results)
        for (const a of rows)
          items.push({
            id: a.id,
            type: 'assignments',
            title: a.title,
            detail: a.classTitle,
            href: '/personal/education/assignments/' + a.id,
          });
      try {
        const exams = await call<S['StudentExamSummary'][]>('/api/v1/academic/exams', { signal });
        for (const e of exams)
          if (valid.some((c) => c.id === e.classId))
            items.push({
              id: e.id,
              type: 'exams',
              title: e.title,
              detail: e.classTitle,
              href:
                '/personal/education/exams/' +
                e.id +
                (['Teacher', 'Manager'].includes(session.context.activeRole ?? '') ? '/edit' : ''),
            });
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof ApiError && [401, 403, 409].includes(error.status)) throw error;
        issues.push(uiText.text_4f7293cf5780);
      }
      return { items, issues, parent: false };
    },
  });
  const rows = q.data ? filterSchoolSearch(q.data.items, query, type in labels ? type : 'all') : [];
  return (
    <>
      <SchoolHeading title={uiText.text_8e87c1832a1e} />
      <Card>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            router.replace(
              '/personal/education/search?' + new URLSearchParams({ q: draft.trim(), type }),
            );
          }}
        >
          <Field label={uiText.text_cd5cdd750175}>
            <input
              autoFocus
              maxLength={100}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={draft.trim().length < 2}>
            <Search size={18} />
            {uiText.text_2a93eb7f06ce}
          </Button>
        </form>
      </Card>
      <nav className={s.tabs} aria-label={uiText.text_042fb068891a}>
        {Object.entries(labels).map(([key, title]) => (
          <Link
            key={key}
            href={'/personal/education/search?' + new URLSearchParams({ q: query, type: key })}
            aria-current={type === key ? 'page' : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {query.length < 2 ? (
        <p>{uiText.text_2b19287411ee}</p>
      ) : q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.parent && <p className={s.hint}>{uiText.text_ecf4dfe1fb25}</p>}
          {!!q.data.issues.length && (
            <p role="alert">
              {uiText.text_408dd141549d}
              {q.data.issues.join(uiText.text_11735aabd336)}
              {uiText.text_a13e10143f9c}{' '}
              <button onClick={() => void q.refetch()}>{uiText.text_8ea79cd585d1}</button>
            </p>
          )}
          {rows.length ? (
            <div className={s.grid}>
              {rows.map((row) => {
                const Icon =
                  row.type === 'classes'
                    ? BookOpen
                    : row.type === 'assignments'
                      ? ClipboardList
                      : FileQuestion;
                return (
                  <Link className={s.classCard} key={row.type + row.id} href={row.href}>
                    <Icon size={22} />
                    <span>{labels[row.type]}</span>
                    <h2>{row.title}</h2>
                    <p>{row.detail}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title={uiText.text_b548ad60076f} description={uiText.text_e984dd22d5e3} />
          )}
        </>
      )}
    </>
  );
}
