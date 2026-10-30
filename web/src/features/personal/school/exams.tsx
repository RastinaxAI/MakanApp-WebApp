'use client';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { ActivityDeliveryStatus } from './activity-delivery';
import s from './school.module.css';
import { base, Card, Field, SchoolHeading, Status, useSchoolAction } from './shared';
type S = components['schemas'];
export function Exams({ classId, teach }: { classId?: string; teach: boolean }) {
  const q = usePersonalApi<S['StudentExamSummary'][]>('/api/v1/academic/exams');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: teach && !classId,
  });
  const [chosen, setChosen] = useState(classId ?? '');
  const rows = q.data?.filter((exam) => !chosen || exam.classId === chosen);
  return (
    <>
      <SchoolHeading
        title="آزمون‌ها"
        description="آزمون‌های منتشرشدهٔ کلاس‌های مجاز شما"
        action={
          teach &&
          chosen && (
            <Button asChild>
              <Link href={`${base}/classes/${chosen}/exams/new`}>ایجاد آزمون</Link>
            </Button>
          )
        }
      />
      {teach && !classId && (
        <Card>
          <Field label="کلاس آزمون">
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">انتخاب کلاس برای ساخت آزمون…</option>
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
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : rows?.length ? (
        <div className={s.grid}>
          {rows.map((exam) => (
            <article key={exam.versionId} className={s.classCard}>
              <Status>{label(exam.publicationState)}</Status>
              <h2>{exam.title}</h2>
              <p>
                {exam.classTitle}
                <br />
                {exam.rules.durationMinutes} دقیقه · {exam.rules.maxScore} نمره
                <br />
                {date(exam.rules.availableFromUtc, true)} تا{' '}
                {date(exam.rules.availableUntilUtc, true)}
              </p>
              <footer className={s.cardActions}>
                <Button asChild>
                  <Link
                    href={base + '/exams/' + exam.id + (teach ? '/edit' : '')}
                    aria-label={(teach ? 'مدیریت آزمون ' : 'مشاهده و شرکت در آزمون ') + exam.title}
                  >
                    {teach ? 'مدیریت آزمون' : 'مشاهده و شرکت در آزمون'}
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="آزمون منتشرشده‌ای موجود نیست"
            description={
              teach
                ? 'پیش‌نویس جدید پس از ایجاد، مستقیماً در ویرایشگر باز می‌شود.'
                : 'پس از انتشار آزمون توسط معلم، آن را اینجا می‌بینید.'
            }
          />
        </Card>
      )}
    </>
  );
}
export function ExamEditor({ id }: { id: string }) {
  const q = usePersonalApi<S['ExamEditorDto']>('/api/v1/academic/exams/' + id + '/editor');
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  return (
    <>
      <SchoolHeading title={item.title} description={item.classTitle + ' · ویرایشگر آزمون'} back />
      {item.versionStatus === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Exam"
          sourceVersionId={item.versionId}
        />
      )}
      <Button variant="outline" asChild>
        <Link href={`${base}/exams/${id}/grading`}>پاسخ‌ها و ارزیابی آزمون</Link>
      </Button>
      <Card>
        <div className={s.row}>
          <Status>{label(item.versionStatus)}</Status>
          <span>{item.durationMinutes} دقیقه</span>
          <span>{item.maxScore} نمره</span>
          <span>{item.questions.length} پرسش</span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {item.versionStatus === 'Draft' && (
          <div className={s.row}>
            <Button asChild>
              <Link href={`${base}/exams/${id}/questions/new`}>افزودن پرسش</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/exams/${id}/review`}>بازبینی و انتشار آزمون</Link>
            </Button>
          </div>
        )}
      </Card>
      <Card title="پرسش‌های آزمون">
        {item.questions.length ? (
          item.questions.map((question) => (
            <div className={s.question} key={question.id}>
              <div className={s.row}>
                <strong>
                  پرسش {question.order} · {question.score} نمره
                </strong>
                <Status>{label(question.type)}</Status>
              </div>
              <p className={s.bodyText}>{question.prompt}</p>
              {question.options.map((option) => (
                <p key={option.id} className={s.option}>
                  {option.text}
                  {option.isCorrect ? ' · پاسخ درست' : ''}
                </p>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="هنوز پرسشی اضافه نشده است" />
        )}
      </Card>
    </>
  );
}
export function AddQuestion({ exam, onSaved }: { exam: S['ExamEditorDto']; onSaved?: () => void }) {
  const [type, setType] = useState<'Descriptive' | 'ObjectiveSingleChoice'>('Descriptive');
  const [filesAllowed, setFilesAllowed] = useState(false);
  const [textRequired, setTextRequired] = useState(true);
  const [contentTypes, setContentTypes] = useState(['application/pdf', 'image/jpeg', 'image/png']);
  const a = useSchoolAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const result = await a.run('/api/v1/academic/exams/' + exam.id + '/questions', {
          order: exam.questions.length + 1,
          type,
          prompt: f.get('prompt'),
          score: Number(f.get('score')),
          attachmentPolicy:
            type === 'Descriptive' && filesAllowed
              ? {
                  attachmentsAllowed: true,
                  textRequired,
                  allowedContentTypes: contentTypes,
                  maximumCount: f.get('maximumCount') ? Number(f.get('maximumCount')) : null,
                  maximumTotalBytes: f.get('maximumMegabytes')
                    ? Number(f.get('maximumMegabytes')) * 1024 * 1024
                    : null,
                }
              : null,
          options:
            type === 'Descriptive'
              ? null
              : [1, 2, 3, 4].map((order) => ({
                  order,
                  text: String(f.get('option' + order)),
                  isCorrect: Number(f.get('correct')) === order,
                })),
          expectedVersionRowVersion: exam.versionRowVersion,
        });
        if (result) {
          if (onSaved) onSaved();
          else form.reset();
        }
      }}
    >
      <Field label="نوع پرسش">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="Descriptive">تشریحی</option>
          <option value="ObjectiveSingleChoice">چهارگزینه‌ای</option>
        </select>
      </Field>
      <Field label="متن پرسش">
        <textarea name="prompt" required />
      </Field>
      <Field label="نمرهٔ پرسش">
        <input type="number" name="score" min={0} step="any" required />
      </Field>
      {type === 'Descriptive' && (
        <fieldset>
          <legend>پیوست پاسخ دانش‌آموز</legend>
          <label>
            <input
              type="checkbox"
              checked={filesAllowed}
              onChange={(e) => setFilesAllowed(e.target.checked)}
            />{' '}
            اجازهٔ ارسال فایل
          </label>
          {filesAllowed && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={textRequired}
                  onChange={(e) => setTextRequired(e.target.checked)}
                />{' '}
                پاسخ متنی همراه فایل الزامی باشد
              </label>
              <fieldset className={s.question}>
                <legend>نوع فایل‌های مجاز</legend>
                {(
                  [
                    ['application/pdf', 'PDF'],
                    ['image/jpeg', 'عکس JPEG'],
                    ['image/png', 'عکس PNG'],
                  ] as const
                ).map(([mime, title]) => (
                  <label className={s.option} key={mime}>
                    <input
                      type="checkbox"
                      checked={contentTypes.includes(mime)}
                      onChange={(e) =>
                        setContentTypes((old) =>
                          e.target.checked ? [...old, mime] : old.filter((v) => v !== mime),
                        )
                      }
                    />
                    {title}
                  </label>
                ))}
                {!contentTypes.length && <p role="alert">حداقل یک نوع فایل را مجاز کنید.</p>}
              </fieldset>
              <Field label="حداکثر تعداد فایل (اختیاری)">
                <input type="number" name="maximumCount" min={1} step={1} />
              </Field>
              <Field label="حداکثر حجم مجموع فایل‌ها به مگابایت (اختیاری)">
                <input type="number" name="maximumMegabytes" min={1} step={1} />
              </Field>
            </>
          )}
        </fieldset>
      )}
      {type === 'ObjectiveSingleChoice' && (
        <>
          {[1, 2, 3, 4].map((n) => (
            <Field label={'گزینهٔ ' + n} key={n}>
              <input name={'option' + n} required />
            </Field>
          ))}
          <Field label="گزینهٔ صحیح">
            <select name="correct" required>
              <option value="">انتخاب پاسخ صحیح…</option>
              {[1, 2, 3, 4].map((n) => (
                <option value={n} key={n}>
                  گزینهٔ {n}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <Button disabled={a.busy || (type === 'Descriptive' && filesAllowed && !contentTypes.length)}>
        ثبت پرسش
      </Button>
      {a.feedback}
    </form>
  );
}
export { StudentExam } from './exam-taking';
