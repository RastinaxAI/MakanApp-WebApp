'use client';
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
import { base, Field, toUtc, useSchoolAction } from './shared';
import { WorkflowForm, WorkflowPage, useWorkflowDraft } from './workflow';
import s from './school.module.css';
import managerStyle from './manager-workspace.module.css';
type S = components['schemas'];
const authors = ['Manager', 'Teacher'];
export function ClassCreatePage() {
  return (
    <WorkflowPage title="ایجاد کلاس" back={base + '/classes'}>
      <ClassCreator />
    </WorkflowPage>
  );
}
function ClassCreator() {
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
        <h2>کلاس ایجاد شد</h2>
        <p>{created.title}</p>
        <div className={managerStyle.steps}>
          <div>
            <span>۱. کلاس ثبت شد؛ معلمان را مشخص کنید.</span>
            <Button asChild>
              <Link href={`${base}/classes/${created.id}/teachers/new`}>انتخاب معلمان کلاس</Link>
            </Button>
          </div>
          <div>
            <span>۲. دانش‌آموزان را به کلاس اضافه کنید.</span>
            <Button asChild>
              <Link href={`${base}/classes/${created.id}/enrollments/new`}>افزودن دانش‌آموزان</Link>
            </Button>
          </div>
        </div>
        <Button asChild>
          <Link href={`${base}/classes/${created.id}`}>ورود به کلاس</Link>
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
          {!valid && <p className={s.hint}>نام کلاس، درس، دوره و ظرفیت معتبر را وارد کنید.</p>}
        </>
      }
      rows={[
        ['نام کلاس', d.values.title],
        ['ظرفیت', d.values.capacity],
        ['وضعیت آغاز', d.values.active ? 'فعال' : 'غیرفعال'],
      ]}
      notice="پس از ساخت کلاس، دانش‌آموزان و معلمان را جداگانه به آن اضافه کنید."
    >
      <div className={s.two}>
        <Field label="نام کلاس">
          <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
        </Field>
        <Field label="ظرفیت کلاس">
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
          <h2>درس کلاس</h2>
          <CatalogPicker
            kind="courses"
            value={d.values.course}
            onChange={(v) => d.set('course', v)}
          />
          <Link href={base + '/courses/new'}>ایجاد درس جدید</Link>
        </section>
        <section className={s.workflowGroup}>
          <h2>دورهٔ آموزشی</h2>
          <CatalogPicker
            kind="periods"
            value={d.values.period}
            onChange={(v) => d.set('period', v)}
          />
          <Link href={base + '/periods/new'}>ایجاد دورهٔ جدید</Link>
        </section>
      </div>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={d.values.active}
          onChange={(e) => d.set('active', e.target.checked)}
        />
        کلاس پس از ایجاد فعال باشد
      </label>
    </WorkflowForm>
  );
}
export function CatalogCreatePage({ kind }: { kind: 'courses' | 'periods' }) {
  return (
    <WorkflowPage
      title={kind === 'courses' ? 'ایجاد درس' : 'ایجاد دورهٔ آموزشی'}
      back={base + '/classes/new'}
    >
      <CatalogCreator kind={kind} />
    </WorkflowPage>
  );
}
function CatalogCreator({ kind }: { kind: 'courses' | 'periods' }) {
  const d = useWorkflowDraft('catalog:' + kind, { title: '', start: '', end: '' }),
    a = useSchoolAction();
  const [saved, setSaved] = useState(false);
  const valid =
    !!d.values.title.trim() &&
    (kind === 'courses' || (!!d.values.start && !!d.values.end && d.values.end >= d.values.start));
  if (saved)
    return (
      <section className={s.receipt}>
        <h2>{kind === 'courses' ? 'درس ثبت شد' : 'دوره ثبت شد'}</h2>
        <Button asChild>
          <Link href={base + '/classes/new'}>ادامهٔ ساخت کلاس</Link>
        </Button>
      </section>
    );
  return (
    <WorkflowForm
      busy={a.busy}
      ready={d.ready}
      canCommit={valid}
      rows={[
        ['عنوان', d.values.title],
        ...(kind === 'periods'
          ? ([
              ['شروع', date(d.values.start, true)],
              ['پایان', date(d.values.end, true)],
            ] as [string, string][])
          : []),
      ]}
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>عنوان و بازهٔ معتبر را کامل کنید.</p>}
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
      <Field label={kind === 'courses' ? 'عنوان درس' : 'عنوان دوره'}>
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      {kind === 'periods' && (
        <>
          <Field label="شروع دوره">
            <JalaliDateInput
              required
              value={d.values.start}
              onValueChange={(v) => d.set('start', v)}
            />
          </Field>
          <Field label="پایان دوره">
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
  return (
    <WorkflowPage
      roles={authors}
      classId={classId}
      title="ایجاد جلسه"
      back={`${base}/classes/${classId}?tab=sessions`}
    >
      <SessionCreator classId={classId} />
    </WorkflowPage>
  );
}
function SessionCreator({ classId }: { classId: string }) {
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
        ['جلسه', d.values.title],
        ['شروع', date(d.values.start, true)],
        ['پایان', date(d.values.end, true)],
        ['پیوند', d.values.link],
      ]}
      error={
        <>
          {a.feedback}
          {!valid && (
            <p className={s.hint}>
              عنوان و بازهٔ معتبر جلسه را وارد کنید؛ پایان باید پس از شروع باشد.
            </p>
          )}
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
      <Field label="عنوان جلسه">
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      <Field label="شروع جلسه">
        <JalaliDateInput
          withTime
          required
          value={d.values.start}
          onValueChange={(v) => d.set('start', v)}
        />
      </Field>
      <Field label="پایان جلسه">
        <JalaliDateInput
          withTime
          required
          value={d.values.end}
          onValueChange={(v) => d.set('end', v)}
        />
      </Field>
      <Field label="پیوند کلاس آنلاین (اختیاری)">
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
  return (
    <WorkflowPage
      roles={authors}
      classId={classId}
      title="ایجاد آزمون"
      back={`${base}/classes/${classId}?tab=exams`}
    >
      <ExamCreator classId={classId} />
    </WorkflowPage>
  );
}
function ExamCreator({ classId }: { classId: string }) {
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
    Number(d.values.score) >= 0;
  return (
    <WorkflowForm
      ready={d.ready}
      canCommit={valid}
      busy={a.busy}
      rows={[
        ['عنوان', d.values.title],
        ['آغاز دسترسی', date(d.values.start, true)],
        ['پایان دسترسی', date(d.values.end, true)],
        ['مدت (دقیقه)', d.values.duration],
        ['دفعات شرکت', d.values.attempts],
        ['نمرهٔ کل', d.values.score],
      ]}
      button="ایجاد پیش‌نویس آزمون"
      notice="پس از ساخت پیش‌نویس، سؤال‌ها را اضافه و پیش از انتشار بازبینی کنید."
      error={
        <>
          {a.feedback}
          {!valid && <p className={s.hint}>عنوان، بازه و مقادیر معتبر آزمون را کامل کنید.</p>}
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['ExamEditorDto']>(
          `/api/v1/academic/classes/${classId}/exams`,
          {
            title: d.values.title.trim(),
            description: d.values.description.trim() || null,
            availableFromUtc: toUtc(d.values.start),
            availableUntilUtc: toUtc(d.values.end),
            durationMinutes: Number(d.values.duration),
            maxAttempts: Number(d.values.attempts),
            maxScore: Number(d.values.score),
            randomizationPolicy: d.values.random ? 'QuestionOrder' : 'None',
          },
        );
        if (result) {
          d.reset();
          router.replace(`${base}/exams/${result.id}/edit`);
        }
      }}
    >
      <Field label="عنوان آزمون">
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      <Field label="توضیحات آزمون">
        <textarea
          value={d.values.description}
          onChange={(e) => d.set('description', e.target.value)}
        />
      </Field>
      <Field label="آغاز دسترسی">
        <JalaliDateInput
          withTime
          required
          value={d.values.start}
          onValueChange={(v) => d.set('start', v)}
        />
      </Field>
      <Field label="پایان دسترسی">
        <JalaliDateInput
          withTime
          required
          value={d.values.end}
          onValueChange={(v) => d.set('end', v)}
        />
      </Field>
      {(
        [
          ['duration', 'مدت آزمون (دقیقه)'],
          ['attempts', 'دفعات مجاز شرکت'],
          ['score', 'نمرهٔ کل'],
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
        ترتیب پرسش‌ها تصادفی باشد
      </label>
    </WorkflowForm>
  );
}
export function GuardianCreatePage() {
  return (
    <WorkflowPage title="دعوت والد برای فرزند" back={base + '/guardians'}>
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
  return (
    <WorkflowPage
      classId={classId}
      roles={kind === 'all' ? authors : ['Manager']}
      title={
        kind === 'all' ? 'اعضای کلاس' : kind === 'learners' ? 'ثبت‌نام دانش‌آموز' : 'انتساب معلم'
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
  return (
    <WorkflowPage roles={authors} title="افزودن پرسش آزمون" back={`${base}/exams/${id}/edit`}>
      <QuestionCreator id={id} />
    </WorkflowPage>
  );
}
function QuestionCreator({ id }: { id: string }) {
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
