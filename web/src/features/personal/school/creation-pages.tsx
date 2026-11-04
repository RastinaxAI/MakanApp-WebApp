'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { Button } from '@/components/ui/button';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { CatalogPicker } from './directory';
import { ClassMembersOverview } from './class-members';
import { ClassMemberAssignment } from './member-assignment';
import { GuardianInvitationForm } from './onboarding';
import { AddQuestion } from './exams';
import { Field, toUtc, useSchoolAction } from './shared';
import { WorkflowForm, WorkflowPage, useWorkflowDraft } from './workflow';
import s from './school.module.css';
import managerStyle from './manager-workspace.module.css';
type S = components['schemas'];
const authors = ['Manager', 'Teacher'];
export function ClassCreatePage() {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage title={uiText.text_34aeac5f09b4} back={base + '/classes'}>
      <ClassCreator />
    </WorkflowPage>
  );
}
function ClassCreator() {
  const { base } = useAcademicScope();
  const d = useWorkflowDraft('class:new', {
      title: '',
      course: '',
      period: '',
      capacity: '',
      active: true,
    }),
    a = useSchoolAction();
  const [created, setCreated] = useState<S['ClassResult']>();
  const valid =
    !!d.values.title.trim() &&
    !!d.values.course &&
    !!d.values.period &&
    Number.isInteger(Number(d.values.capacity)) &&
    Number(d.values.capacity) > 0;
  if (created)
    return (
      <section className={s.receipt}>
        <h2>{uiText.text_946c6e906859}</h2>
        <p>{created.title}</p>
        <div className={managerStyle.steps}>
          <div>
            <span>{uiText.text_f911d7c42a09}</span>
            <Button asChild>
              <Link href={`${base}/classes/${created.id}/teachers/new`}>
                {uiText.text_78535b54c92b}
              </Link>
            </Button>
          </div>
          <div>
            <span>{uiText.text_29f48210ac93}</span>
            <Button asChild>
              <Link href={`${base}/classes/${created.id}/enrollments/new`}>
                {uiText.text_cc708e53902b}
              </Link>
            </Button>
          </div>
        </div>
        <Button asChild>
          <Link href={`${base}/classes/${created.id}`}>{uiText.text_e0c1b3a8ec7a}</Link>
        </Button>
      </section>
    );
  return (
    <WorkflowForm
      busy={a.busy}
      ready={d.ready}
      canCommit={valid}
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['ClassResult']>('/api/v1/academic/classes', {
          title: d.values.title.trim(),
          courseId: d.values.course,
          academicPeriodId: d.values.period,
          capacity: Number(d.values.capacity),
          activateImmediately: d.values.active,
        });
        if (result) {
          d.reset();
          setCreated(result);
        }
      }}
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>{uiText.text_5fb4677a90df}</p>}
        </>
      }
      rows={[
        [uiText.text_e5199f5b6d80, d.values.title],
        [uiText.text_57400196e6de, d.values.capacity],
        [
          uiText.text_eabfbd7982f4,
          d.values.active ? uiText.text_a3fa2a3ffcb9 : uiText.text_4e67bd8e3482,
        ],
      ]}
      notice={uiText.text_1227743339e4}
    >
      <div className={s.two}>
        <Field label={uiText.text_e5199f5b6d80}>
          <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
        </Field>
        <Field label={uiText.text_23c14d587863}>
          <input
            required
            min={1}
            step={1}
            type="number"
            value={d.values.capacity}
            onChange={(e) => d.set('capacity', e.target.value)}
          />
        </Field>
      </div>
      <div className={s.two}>
        <section className={s.workflowGroup}>
          <h2>{uiText.text_f742001e0e88}</h2>
          <CatalogPicker
            kind="courses"
            value={d.values.course}
            onChange={(v) => d.set('course', v)}
          />
          <Link href={base + '/courses/new'}>{uiText.text_9f30c2048bc7}</Link>
        </section>
        <section className={s.workflowGroup}>
          <h2>{uiText.text_4abb03b122f4}</h2>
          <CatalogPicker
            kind="periods"
            value={d.values.period}
            onChange={(v) => d.set('period', v)}
          />
          <Link href={base + '/periods/new'}>{uiText.text_51add6a204d5}</Link>
        </section>
      </div>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={d.values.active}
          onChange={(e) => d.set('active', e.target.checked)}
        />
        {uiText.text_65b84c86f2b8}
      </label>
    </WorkflowForm>
  );
}
export function CatalogCreatePage({ kind }: { kind: 'courses' | 'periods' }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={kind === 'courses' ? uiText.text_bc7837ca0bbb : uiText.text_c19ede0cddae}
      back={base + '/classes/new'}
    >
      <CatalogCreator kind={kind} />
    </WorkflowPage>
  );
}
function CatalogCreator({ kind }: { kind: 'courses' | 'periods' }) {
  const { base } = useAcademicScope();
  const d = useWorkflowDraft('catalog:' + kind, { title: '', start: '', end: '' }),
    a = useSchoolAction();
  const [saved, setSaved] = useState(false);
  const valid =
    !!d.values.title.trim() &&
    (kind === 'courses' || (!!d.values.start && !!d.values.end && d.values.end >= d.values.start));
  if (saved)
    return (
      <section className={s.receipt}>
        <h2>{kind === 'courses' ? uiText.text_a8e9400f558e : uiText.text_55dd273e4ada}</h2>
        <Button asChild>
          <Link href={base + '/classes/new'}>{uiText.text_75454f626ebf}</Link>
        </Button>
      </section>
    );
  return (
    <WorkflowForm
      busy={a.busy}
      ready={d.ready}
      canCommit={valid}
      rows={[
        [uiText.text_74190f4bb095, d.values.title],
        ...(kind === 'periods'
          ? ([
              [uiText.text_103613fd03b5, date(d.values.start, true)],
              [uiText.text_3f05817a3011, date(d.values.end, true)],
            ] as [string, string][])
          : []),
      ]}
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>{uiText.text_e847e6618d02}</p>}
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run('/api/v1/academic/' + kind, {
          title: d.values.title.trim(),
          ...(kind === 'periods' ? { startDate: d.values.start, endDate: d.values.end } : {}),
        });
        if (result) {
          d.reset();
          setSaved(true);
        }
      }}
    >
      <Field label={kind === 'courses' ? uiText.text_9398dccd15ef : uiText.text_8ce15ef5c0a9}>
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      {kind === 'periods' && (
        <>
          <Field label={uiText.text_c2e6c9ca70e0}>
            <JalaliDateInput
              required
              value={d.values.start}
              onValueChange={(v) => d.set('start', v)}
            />
          </Field>
          <Field label={uiText.text_07659e16252d}>
            <JalaliDateInput
              min={d.values.start}
              required
              value={d.values.end}
              onValueChange={(v) => d.set('end', v)}
            />
          </Field>
        </>
      )}
    </WorkflowForm>
  );
}
export { PersonFormPage, PersonDetailPage } from './person-records';
export function SessionCreatePage({ classId }: { classId: string }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      roles={authors}
      classId={classId}
      title={uiText.text_8a8bca7672c8}
      back={`${base}/classes/${classId}?tab=sessions`}
    >
      <SessionCreator classId={classId} />
    </WorkflowPage>
  );
}
function SessionCreator({ classId }: { classId: string }) {
  const { base } = useAcademicScope();
  const d = useWorkflowDraft('session:new:' + classId, { title: '', start: '', end: '', link: '' }),
    a = useSchoolAction(),
    router = useRouter();
  const valid =
    !!d.values.title.trim() &&
    Number.isFinite(Date.parse(d.values.start)) &&
    Date.parse(d.values.end) > Date.parse(d.values.start);
  return (
    <WorkflowForm
      ready={d.ready}
      canCommit={valid}
      busy={a.busy}
      rows={[
        [uiText.text_69450aad3cb7, d.values.title],
        [uiText.text_103613fd03b5, date(d.values.start, true)],
        [uiText.text_3f05817a3011, date(d.values.end, true)],
        [uiText.text_ea3eced42f9c, d.values.link],
      ]}
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>{uiText.text_73b7befc5afa}</p>}
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['SessionResult']>(
          `/api/v1/academic/classes/${classId}/sessions`,
          {
            title: d.values.title.trim(),
            startUtc: toUtc(d.values.start),
            endUtc: toUtc(d.values.end),
            timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
            meetingUrl: d.values.link.trim() || null,
          },
        );
        if (result) {
          d.reset();
          router.replace(`${base}/sessions/${result.id}`);
        }
      }}
    >
      <Field label={uiText.text_70786012eed4}>
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      <Field label={uiText.text_0d5f82b11e8c}>
        <JalaliDateInput
          withTime
          required
          value={d.values.start}
          onValueChange={(v) => d.set('start', v)}
        />
      </Field>
      <Field label={uiText.text_0559b65628ea}>
        <JalaliDateInput
          withTime
          required
          value={d.values.end}
          onValueChange={(v) => d.set('end', v)}
        />
      </Field>
      <Field label={uiText.text_9d6b7140edeb}>
        <input
          type="url"
          dir="ltr"
          value={d.values.link}
          onChange={(e) => d.set('link', e.target.value)}
        />
      </Field>
    </WorkflowForm>
  );
}
export function ExamCreatePage({ classId }: { classId: string }) {
  const { classPath } = useAcademicScope();
  return (
    <WorkflowPage
      roles={authors}
      classId={classId}
      title={uiText.text_00f6d8e48e00}
      back={classPath(classId) + '/exams'}
    >
      <ExamCreator classId={classId} />
    </WorkflowPage>
  );
}
function ExamCreator({ classId }: { classId: string }) {
  const { classApi } = useAcademicScope();
  const { base } = useAcademicScope();
  const d = useWorkflowDraft('exam:new:' + classId, {
      title: '',
      description: '',
      start: '',
      end: '',
      duration: '',
      attempts: '',
      score: '',
      random: false,
    }),
    a = useSchoolAction(),
    router = useRouter();
  const valid =
    !!d.values.title.trim() &&
    Date.parse(d.values.end) > Date.parse(d.values.start) &&
    Number(d.values.duration) > 0 &&
    Number.isInteger(Number(d.values.duration)) &&
    Number(d.values.attempts) > 0 &&
    Number.isInteger(Number(d.values.attempts)) &&
    d.values.score !== '' &&
    Number(d.values.score) > 0;
  return (
    <WorkflowForm
      ready={d.ready}
      canCommit={valid}
      busy={a.busy}
      rows={[
        [uiText.text_74190f4bb095, d.values.title],
        [uiText.text_8ea5a5c720cd, date(d.values.start, true)],
        [uiText.text_5cff509ed1c9, date(d.values.end, true)],
        [uiText.text_3a48c2c3e3b8, d.values.duration],
        [uiText.text_0fe100cdea24, d.values.attempts],
        [uiText.text_25823dfdfd3f, d.values.score],
      ]}
      button={uiText.text_938008426aca}
      notice={uiText.text_a748d1afb9b2}
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>{uiText.text_8476a4fa8850}</p>}
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['ExamEditorDto']>(classApi(classId) + '/exams', {
          title: d.values.title.trim(),
          description: d.values.description.trim() || null,
          availableFromUtc: toUtc(d.values.start),
          availableUntilUtc: toUtc(d.values.end),
          durationMinutes: Number(d.values.duration),
          maxAttempts: Number(d.values.attempts),
          maxScore: Number(d.values.score),
          randomizationPolicy: d.values.random ? 'QuestionOrder' : 'None',
        });
        if (result) {
          d.reset();
          router.replace(`${base}/exams/${result.id}/edit`);
        }
      }}
    >
      <Field label={uiText.text_981230e1e35e}>
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      <Field label={uiText.text_4a72e6b798a7}>
        <textarea
          value={d.values.description}
          onChange={(e) => d.set('description', e.target.value)}
        />
      </Field>
      <Field label={uiText.text_8ea5a5c720cd}>
        <JalaliDateInput
          withTime
          required
          value={d.values.start}
          onValueChange={(v) => d.set('start', v)}
        />
      </Field>
      <Field label={uiText.text_5cff509ed1c9}>
        <JalaliDateInput
          withTime
          required
          value={d.values.end}
          onValueChange={(v) => d.set('end', v)}
        />
      </Field>
      {(
        [
          ['duration', uiText.text_2cced62fbe37],
          ['attempts', uiText.text_6c1546f241c8],
          ['score', uiText.text_25823dfdfd3f],
        ] as const
      ).map(([key, title]) => (
        <Field key={key} label={title}>
          <input
            type="number"
            min={key === 'score' ? 0 : 1}
            step={key === 'score' ? 'any' : 1}
            required
            value={d.values[key]}
            onChange={(e) => d.set(key, e.target.value)}
          />
        </Field>
      ))}
      <label className={s.check}>
        <input
          type="checkbox"
          checked={d.values.random}
          onChange={(e) => d.set('random', e.target.checked)}
        />
        {uiText.text_61f1cd67e9a3}
      </label>
    </WorkflowForm>
  );
}
export function GuardianCreatePage() {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage title={uiText.text_c82d6822d030} back={base + '/guardians'}>
      <section className={s.card}>
        <GuardianInvitationForm />
      </section>
    </WorkflowPage>
  );
}
export function ClassMembersPage({
  classId,
  kind,
}: {
  classId: string;
  kind: 'learners' | 'teachers' | 'all';
}) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      classId={classId}
      roles={kind === 'all' ? authors : ['Manager']}
      title={
        kind === 'all'
          ? uiText.text_29c02fa4bd09
          : kind === 'learners'
            ? uiText.text_e82efffd7b2d
            : uiText.text_0766ac45d984
      }
      back={`${base}/classes/${classId}`}
    >
      {kind === 'all' ? (
        <section className={s.card}>
          <ClassMembersOverview classId={classId} />
        </section>
      ) : (
        <ClassMemberAssignment key={classId + ':' + kind} classId={classId} kind={kind} />
      )}
    </WorkflowPage>
  );
}
export function QuestionCreatePage({ id }: { id: string }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      roles={authors}
      title={uiText.text_78bf2b9b9225}
      back={`${base}/exams/${id}/edit`}
    >
      <QuestionCreator id={id} />
    </WorkflowPage>
  );
}
function QuestionCreator({ id }: { id: string }) {
  const { base } = useAcademicScope();
  const q = usePersonalApi<S['ExamEditorDto']>(`/api/v1/academic/exams/${id}/editor`),
    router = useRouter();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.versionStatus !== 'Draft') return <ErrorState error={new ApiError(403)} />;
  return (
    <section className={s.card}>
      <h2>{q.data.title}</h2>
      <AddQuestion exam={q.data} onSaved={() => router.replace(`${base}/exams/${id}/edit`)} />
    </section>
  );
}
