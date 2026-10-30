'use client';
import { PageBack } from '@/components/navigation/page-back';
import { ActivityDeliveryStatus } from './activity-delivery';
import { Button } from '@/components/ui/button';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import { schoolRoutes } from '@/config/navigation';
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
import { base, Card, Field, Pager, SchoolHeading, Status, toUtc, useSchoolAction } from './shared';
type S = components['schemas'];
export function Assignments({ classId, teach }: { classId?: string; teach: boolean }) {
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
        title="تکلیف‌ها"
        description={
          teach
            ? 'تکلیف هر کلاس را آماده و منتشر کنید؛ پاسخ‌های دانش‌آموزان را از داخل تکلیف بررسی کنید.'
            : 'تکلیف را بخوانید، پاسخ را ذخیره کنید و در پایان تحویل دهید.'
        }
        action={
          teach &&
          chosen && (
            <Button asChild>
              <Link href={`${base}/classes/${chosen}/assignments/new`}>ایجاد تکلیف</Link>
            </Button>
          )
        }
      />
      {!classId && (
        <Card>
          <Field label="کلاس تکلیف">
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">یک کلاس انتخاب کنید…</option>
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
                  مهلت: {date(a.dueAtUtc, true)}
                </p>
                <footer className={s.cardActions}>
                  <Button asChild>
                    <Link
                      href={base + '/assignments/' + a.id}
                      aria-label={'مشاهدهٔ تکلیف و پاسخ‌ها ' + a.title}
                    >
                      مشاهدهٔ تکلیف و پاسخ‌ها
                    </Link>
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState title="تکلیفی در این کلاس موجود نیست" />
          </Card>
        ))}
    </>
  );
}
export function AssignmentFormPage({ classId }: { classId: string }) {
  const { session } = usePersonal();
  if (!['Teacher', 'Manager'].includes(session.context.activeRole ?? ''))
    return <ErrorState error={new ApiError(403)} />;
  return (
    <div data-school-form>
      <h1 className="sr-only">افزودن تکلیف</h1>
      <ReferenceColumns form>
        <p className={f.intro}>تمرین را با هدف و مهلت مشخص بسازید.</p>
        <CreateAssignment classId={classId} />
      </ReferenceColumns>
    </div>
  );
}
function CreateAssignment({ classId }: { classId: string }) {
  const a = useSchoolAction(),
    router = useRouter();
  return (
    <form
      className={f.body}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = await a.run<S['AssignmentResult']>(
          '/api/v1/academic/classes/' + classId + '/assignments',
          {
            title: f.get('title'),
            description: f.get('description'),
            dueAtUtc: toUtc(String(f.get('due'))),
            allowLateSubmission: f.get('late') === 'on',
            maxAttempts: Number(f.get('attempts')),
            maxScore: Number(f.get('score')),
          },
        );
        if (result) router.push(base + '/assignments/' + result.id);
      }}
    >
      <Field label="عنوان تکلیف">
        <input required name="title" />
      </Field>
      <Field label="شرح تکلیف">
        <textarea required name="description" />
      </Field>
      <h2 className={f.sectionLabel}>تنظیمات تحویل</h2>
      <Field label="مهلت تحویل">
        <JalaliDateInput required withTime name="due" />
      </Field>
      <div className={s.two}>
        <Field label="حداکثر دفعات تحویل">
          <input name="attempts" type="number" required min={1} step={1} />
        </Field>
        <Field label="نمرهٔ کل">
          <input name="score" type="number" required min={0} step="any" />
        </Field>
      </div>
      <label className={s.check}>
        <input name="late" type="checkbox" />
        تحویل با تأخیر مجاز باشد
      </label>
      <div className={f.actions}>
        <Button type="submit" disabled={a.busy}>
          ذخیرهٔ پیش‌نویس تکلیف
        </Button>
        <PageBack href={`${base}/classes/${classId}`} />
      </div>
      {a.feedback}
    </form>
  );
}
export function AssignmentDetail({ id, teach }: { id: string; teach: boolean }) {
  const q = usePersonalApi<S['AssignmentResult']>('/api/v1/academic/assignments/' + id);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  return (
    <>
      <SchoolHeading title={item.title} description={item.classTitle} back />
      <Card>
        <div className={s.row}>
          <Status>{label(item.status)}</Status>
          <span>مهلت: {date(item.dueAtUtc, true)}</span>
          <span>نمرهٔ کل: {item.maxScore}</span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {teach && item.status === 'Draft' && (
          <div className={s.row}>
            <Button asChild variant="outline">
              <Link href={`${base}/assignments/${id}/edit`}>ویرایش پیش‌نویس تکلیف</Link>
            </Button>
            <Button asChild>
              <Link href={`${base}/assignments/${id}/publish-review`}>بازبینی و انتشار تکلیف</Link>
            </Button>
          </div>
        )}
      </Card>
      {teach && item.status === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Assignment"
          sourceVersionId={item.versionId}
        />
      )}
      {teach ? (
        <Card title="ارزیابی پاسخ‌ها">
          <Button asChild>
            <Link href={`${base}/assignments/${id}/evaluations`}>پاسخ‌های دریافتی و ارزیابی</Link>
          </Button>
        </Card>
      ) : (
        <Card title="پاسخ من">
          <Button asChild>
            <Link href={schoolRoutes.answer(id)}>مشاهده و پاسخ به تکلیف</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/assignments/${id}/history`}>پاسخ‌های قبلی و نتایج</Link>
          </Button>
        </Card>
      )}
    </>
  );
}
export { Schedule } from './schedule';
export function TeacherLearners({ classId }: { classId: string }) {
  const dashboard = usePersonalApi<S['TeacherDashboardDto']>('/api/v1/dashboards/teacher');
  const assigned = dashboard.data?.assignedClasses.find((item) => item.classId === classId);
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfTeacherAssignmentReportItem']>(
    `/api/v1/reports/teacher/classes/${classId}/assignments?PageNumber=${page}&PageSize=30`,
  );
  return (
    <Card title="پیگیری دانش‌آموزان">
      {assigned && (
        <p className={s.notice}>
          دانش‌آموزان فعال کلاس:{' '}
          {new Intl.NumberFormat('fa-IR').format(assigned.activeLearnerCount)} نفر
        </p>
      )}
      <p className={s.hint}>
        این فهرست، گزارش تکلیف‌های دانش‌آموزان است؛ دانش‌آموزی که هنوز تکلیفی برایش منتشر نشده ممکن
        است در گزارش نباشد.
      </p>
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
                    <th>دانش‌آموز</th>
                    <th>تکلیف</th>
                    <th>تحویل</th>
                    <th>نمرهٔ جاری</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row.assignmentVersionId + row.enrollmentId}>
                      <td>{row.learnerDisplayName}</td>
                      <td>
                        <Link href={base + '/assignments/' + row.assignmentId}>{row.title}</Link>
                      </td>
                      <td>{row.submissionStatus ? label(row.submissionStatus) : 'تحویل نداده'}</td>
                      <td>{row.currentScore ?? 'هنوز نمره ندارد'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="فعالیتی در گزارش موجود نیست" />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
