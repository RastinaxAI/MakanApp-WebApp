'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { PageBack } from '@/components/navigation/page-back';
import { ActivityDeliveryStatus } from './activity-delivery';
import { Button } from '@/components/ui/button';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePersonal, usePersonalApi } from '../provider';
import { ReferenceColumns } from '../reference-layout';
import { ApiError } from '@/lib/api/errors';
import f from './reference-form.module.css';
import s from './school.module.css';
import { Card, Field, Pager, SchoolHeading, Status, toUtc, useSchoolAction } from './shared';
type S = components['schemas'];
export function Assignments({ classId, teach }: { classId?: string; teach: boolean }) {
  const { base } = useAcademicScope();
  const [chosen, setChosen] = useState(classId ?? '');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: !classId,
  });
  const q = usePersonalApi<S['AssignmentResult'][]>(
    '/api/v1/academic/classes/' + chosen + '/assignments',
    { enabled: !!chosen },
  );
  return (
    <>
      <SchoolHeading
        title={uiText.text_e8fed4d47d62}
        description={teach ? uiText.text_1e4beb165475 : uiText.text_12930efb22f3}
        action={
          teach &&
          chosen && (
            <Button asChild>
              <Link href={`${base}/classes/${chosen}/assignments/new`}>
                {uiText.text_66eea532efc0}
              </Link>
            </Button>
          )
        }
      />
      {!classId && (
        <Card>
          <Field label={uiText.text_c476f4996767}>
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">{uiText.text_64a80eb6ce5b}</option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          {classes.isError && <ErrorState error={classes.error} />}
        </Card>
      )}
      {chosen &&
        (q.isPending ? (
          <LoadingSkeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.length ? (
          <div className={s.grid}>
            {q.data.map((a) => (
              <article key={a.id} className={s.classCard}>
                <Status>{label(a.status)}</Status>
                <h2>{a.title}</h2>
                <p>
                  {a.classTitle}
                  <br />
                  {uiText.text_fbb3425cdeea}
                  {date(a.dueAtUtc, true)}
                </p>
                <footer className={s.cardActions}>
                  <Button asChild>
                    <Link
                      href={base + '/assignments/' + a.id}
                      aria-label={uiText.text_3a93670cd3c7 + a.title}
                    >
                      {uiText.text_5588a43e9669}
                    </Link>
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState title={uiText.text_5cb8d6841586} />
          </Card>
        ))}
    </>
  );
}
export function AssignmentFormPage({ classId }: { classId: string }) {
  const { session } = usePersonal();
  const scope = useAcademicScope();
  if (
    scope.personal
      ? !scope.personal.assignments
      : !['Teacher', 'Manager'].includes(session.context.activeRole ?? '')
  )
    return <ErrorState error={new ApiError(403)} />;
  return (
    <div data-school-form>
      <h1 className="sr-only">{uiText.text_6ddab36198ac}</h1>
      <ReferenceColumns form>
        <p className={f.intro}>{uiText.text_f71501099cc4}</p>
        <CreateAssignment classId={classId} />
      </ReferenceColumns>
    </div>
  );
}
function CreateAssignment({ classId }: { classId: string }) {
  const { base } = useAcademicScope();
  const { classApi, classPath } = useAcademicScope();
  const a = useSchoolAction(),
    router = useRouter();
  return (
    <form
      className={f.body}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = await a.run<S['AssignmentResult']>(classApi(classId) + '/assignments', {
          title: f.get('title'),
          description: f.get('description'),
          dueAtUtc: toUtc(String(f.get('due'))),
          allowLateSubmission: f.get('late') === 'on',
          maxAttempts: Number(f.get('attempts')),
          maxScore: Number(f.get('score')),
        });
        if (result) router.push(base + '/assignments/' + result.id);
      }}
    >
      <Field label={uiText.text_c864088e1061}>
        <input required name="title" />
      </Field>
      <Field label={uiText.text_1d3c268468ff}>
        <textarea required name="description" />
      </Field>
      <h2 className={f.sectionLabel}>{uiText.text_8dfc669046e4}</h2>
      <Field label={uiText.text_2b26e703adf2}>
        <JalaliDateInput required withTime name="due" />
      </Field>
      <div className={s.two}>
        <Field label={uiText.text_0e469bc1ffab}>
          <input name="attempts" type="number" required min={1} step={1} />
        </Field>
        <Field label={uiText.text_25823dfdfd3f}>
          <input name="score" type="number" required min={0.01} step="0.01" />
        </Field>
      </div>
      <label className={s.check}>
        <input name="late" type="checkbox" />
        {uiText.text_8dd151936022}
      </label>
      <div className={f.actions}>
        <Button type="submit" disabled={a.busy}>
          {uiText.text_6cac361a9d88}
        </Button>
        <PageBack href={classPath(classId)} />
      </div>
      {a.feedback}
    </form>
  );
}
export function AssignmentDetail({ id, teach }: { id: string; teach: boolean }) {
  const scope = useAcademicScope();
  const { base, routes: schoolRoutes } = useAcademicScope();
  const q = usePersonalApi<S['AssignmentResult']>('/api/v1/academic/assignments/' + id);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  if (!scope.matches(item)) return <ErrorState error={new ApiError(404)} />;
  return (
    <>
      <SchoolHeading title={item.title} description={item.classTitle} back />
      <Card>
        <div className={s.row}>
          <Status>{label(item.status)}</Status>
          <span>
            {uiText.text_fbb3425cdeea}
            {date(item.dueAtUtc, true)}
          </span>
          <span>
            {uiText.text_895fe6a2fd56}
            {item.maxScore}
          </span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {teach && (!scope.personal || scope.personal.assignments) && item.status === 'Draft' && (
          <div className={s.row}>
            <Button asChild variant="outline">
              <Link href={`${base}/assignments/${id}/edit`}>{uiText.text_1d3577cf9675}</Link>
            </Button>
            <Button asChild>
              <Link href={`${base}/assignments/${id}/publish-review`}>
                {uiText.text_4d420238b323}
              </Link>
            </Button>
          </div>
        )}
      </Card>
      {teach && !scope.personal && item.status === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Assignment"
          sourceVersionId={item.versionId}
        />
      )}
      {teach && (!scope.personal || scope.personal.grade) ? (
        <Card title={uiText.text_3b74a41eb771}>
          <Button asChild>
            <Link href={`${base}/assignments/${id}/evaluations`}>{uiText.text_6475ed5d6ade}</Link>
          </Button>
        </Card>
      ) : (
        (!scope.personal || scope.personal.ownResults) && (
          <Card title={uiText.text_185168f80806}>
            <Button asChild>
              <Link href={schoolRoutes.answer(id)}>{uiText.text_2ea16ced02c4}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/assignments/${id}/history`}>{uiText.text_73b4dad6356e}</Link>
            </Button>
          </Card>
        )
      )}
    </>
  );
}
export { Schedule } from './schedule';
export function TeacherLearners({ classId }: { classId: string }) {
  const { base } = useAcademicScope();
  const dashboard = usePersonalApi<S['TeacherDashboardDto']>('/api/v1/dashboards/teacher');
  const assigned = dashboard.data?.assignedClasses.find((item) => item.classId === classId);
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfTeacherAssignmentReportItem']>(
    `/api/v1/reports/teacher/classes/${classId}/assignments?PageNumber=${page}&PageSize=30`,
  );
  return (
    <Card title={uiText.text_e443a9f2c748}>
      {assigned && (
        <p className={s.notice}>
          {uiText.text_5e21cda4898b}{' '}
          {new Intl.NumberFormat('fa-IR').format(assigned.activeLearnerCount)}
          {uiText.text_56bfaedd15bf}
        </p>
      )}
      <p className={s.hint}>{uiText.text_1cab39a10925}</p>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{uiText.text_fbd179d162db}</th>
                    <th>{uiText.text_b9bdf50e5da3}</th>
                    <th>{uiText.text_87479d632cb0}</th>
                    <th>{uiText.text_2b9d6b6b7916}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row.assignmentVersionId + row.enrollmentId}>
                      <td>{row.learnerDisplayName}</td>
                      <td>
                        <Link href={base + '/assignments/' + row.assignmentId}>{row.title}</Link>
                      </td>
                      <td>
                        {row.submissionStatus
                          ? label(row.submissionStatus)
                          : uiText.text_2675dd46965d}
                      </td>
                      <td>{row.currentScore ?? uiText.text_ad09745dadec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={uiText.text_0f71dc23b496} />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
