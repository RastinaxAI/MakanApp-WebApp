'use client';
import { PageBack } from '@/components/navigation/page-back';
import { useTextDraft } from '@/components/hooks/use-text-draft';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { schoolRoutes } from '@/config/navigation';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { CheckCircle2, FilePenLine, Save } from 'lucide-react';
import { usePersonal, usePersonalApi } from '../provider';
import s from './school.module.css';
import r from './assessment.module.css';
import { SubmissionFiles } from './submission-files';
import { Card, Field, SchoolHeading, useSchoolAction } from './shared';
import {
  canReviewSubmission,
  matchesSubmission,
  receiptFromAttempt,
  validSubmissionReceipt,
  type SubmissionStage,
} from './submission-model';
type S = components['schemas'];

export function SubmissionFlow({ id, stage }: { id: string; stage: SubmissionStage }) {
  const { session } = usePersonal();
  if (session.context.activeRole !== 'Student') return <ErrorState error={new ApiError(403)} />;
  return <OwnSubmission key={session.revision + ':' + id + ':' + stage} id={id} stage={stage} />;
}
function OwnSubmission({ id, stage }: { id: string; stage: SubmissionStage }) {
  const router = useRouter(),
    requested = useSearchParams().get('attempt');
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    `/api/v1/academic/assignments/${id}/attempts/me`,
  );
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const candidate = requested
    ? q.data.find((item) => item.id === requested)
    : (q.data.find((item) => item.status === 'Draft') ??
      (stage === 'receipt'
        ? q.data
            .filter((item) => item.status === 'Submitted')
            .sort((a, b) => b.attemptNumber - a.attemptNumber)[0]
        : undefined));
  if (!candidate)
    return (
      <>
        <SchoolHeading title="پاسخ من" />
        <Card>
          <p>برای این تکلیف، پاسخ جدیدی شروع کنید.</p>
          <Button
            disabled={a.busy || stage !== 'answer'}
            onClick={async () => {
              const result = await a.run<S['SubmissionAttemptResult']>(
                `/api/v1/academic/assignments/${id}/attempts`,
              );
              if (result) router.replace(schoolRoutes.answer(id) + '?attempt=' + result.id);
            }}
          >
            شروع پاسخ جدید
          </Button>
          <PageBack href={schoolRoutes.assignment(id)} />
          {a.feedback}
        </Card>
      </>
    );
  return <LoadedSubmission key={candidate.id} id={id} attemptId={candidate.id} stage={stage} />;
}
function LoadedSubmission({
  id,
  attemptId,
  stage,
}: {
  id: string;
  attemptId: string;
  stage: SubmissionStage;
}) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['SubmissionAttemptResult']>(
    `/api/v1/academic/submission-attempts/${attemptId}`,
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!matchesSubmission(q.data, id, session.context.organizationId))
    return <ErrorState error={new ApiError(403)} />;
  return (
    <SubmissionEditor
      value={q.data}
      stage={stage}
      reload={() => q.refetch().then((result) => result.data)}
    />
  );
}
function SubmissionEditor({
  value,
  stage,
  reload,
}: {
  value: S['SubmissionAttemptResult'];
  stage: SubmissionStage;
  reload: () => Promise<S['SubmissionAttemptResult'] | undefined>;
}) {
  const { session } = usePersonal(),
    router = useRouter(),
    a = useSchoolAction();
  const draft = useTextDraft(
    `${session.user.id}:${contextSignature(session.context)}:submission:${value.id}`,
    value.answerText ?? '',
    value.rowVersion,
  );
  const [error, setError] = useState<unknown>(),
    [fileBusy, setFileBusy] = useState(false),
    [submitting, setSubmitting] = useState(false),
    lock = useRef(false);
  const query = '?attempt=' + value.id;
  const confirmed = receiptFromAttempt(value);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const latest = await reload();
      if (!latest) throw new ApiError(503);
      if (receiptFromAttempt(latest)) {
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
        return;
      }
      if (latest.rowVersion !== value.rowVersion)
        throw new ApiError(409, { code: 'SUBMISSION_VERSION_CONFLICT' });
      const receipt = await a.run<S['SubmissionReceipt']>(
        `/api/v1/academic/submission-attempts/${value.id}/submit`,
        { expectedRowVersion: value.rowVersion },
      );
      if (receipt && validSubmissionReceipt(receipt, value.assignmentId, value.id)) {
        draft.reset();
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
        return;
      }
      // Lost response is not a failure guarantee: only an authoritative Submitted read reconciles it.
      const after = await reload();
      if (after && receiptFromAttempt(after)) {
        draft.reset();
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
      } else if (receipt) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  if (stage === 'receipt')
    return (
      <>
        <SchoolHeading title="رسید تحویل تکلیف" />
        <Card>
          {confirmed ? (
            <div className={s.receipt}>
              <h2>تکلیف تحویل داده شد</h2>
              <p>شمارهٔ تلاش: {confirmed.attemptNumber.toLocaleString('fa-IR')}</p>
              <p>زمان ثبت: {date(confirmed.submittedAtUtc, true)}</p>
              <p>در انتظار ارزیابی استاد</p>
            </div>
          ) : (
            <p role="alert">تحویل این پاسخ هنوز توسط سرویس تأیید نشده است.</p>
          )}
          {confirmed && <SubmissionFiles value={value} />}
          <PageBack href={schoolRoutes.assignment(value.assignmentId)} />
        </Card>
      </>
    );
  if (confirmed)
    return (
      <>
        <SchoolHeading title="پاسخ ثبت‌شده" />
        <Card>
          <p>این پاسخ قبلاً تحویل شده است.</p>
          <Button asChild>
            <Link href={schoolRoutes.receipt(value.assignmentId) + query}>مشاهدهٔ رسید</Link>
          </Button>
        </Card>
      </>
    );
  return (
    <div className={r.workspace} data-school-form data-submission-workspace>
      <header className={r.heading}>
        <div>
          <span className={r.eyebrow}>آموزشگاه / تکالیف</span>
          <h1>{stage === 'review' ? 'بازبینی پاسخ تکلیف' : 'پاسخ‌نامهٔ تکلیف'}</h1>
          <p className={r.muted}>پاسخ خود را آماده کنید، بازبینی کنید و سپس تحویل دهید.</p>
        </div>
        <PageBack href={schoolRoutes.assignment(value.assignmentId)} />
      </header>
      <ol className={r.steps} aria-label="مراحل تحویل تکلیف">
        {['نوشتن پاسخ', 'بازبینی', 'رسید تحویل'].map((title, i) => (
          <li
            key={title}
            aria-current={(stage === 'answer' ? i === 0 : i === 1) ? 'step' : undefined}
          >
            <span>{(i + 1).toLocaleString('fa-IR')}</span>
            {title}
          </li>
        ))}
      </ol>
      <div className={r.layout}>
        <div className={r.mainColumn}>
          <section className={r.panel}>
            <div className={r.panelTitle}>
              <FilePenLine size={22} />
              <h2>{stage === 'answer' ? 'متن پاسخ شما' : 'مرور پاسخ شما'}</h2>
            </div>
            {stage === 'answer' ? (
              <>
                <div className={r.answerField}>
                  <Field label="پاسخ تکلیف">
                    <textarea
                      rows={10}
                      value={draft.text}
                      disabled={fileBusy || a.busy || !draft.ready || value.status !== 'Draft'}
                      onChange={(e) => draft.setText(e.target.value)}
                      placeholder="پاسخ خود را اینجا بنویسید…"
                    />
                  </Field>
                </div>
                {draft.baseVersion !== value.rowVersion && (
                  <p role="alert">
                    نسخهٔ سرور تغییر کرده است؛ پیش از ادامه، تغییرات خود را مقایسه کنید.
                  </p>
                )}
                <div className={r.editorBar} data-dirty={draft.dirty}>
                  <span>
                    {draft.dirty ? <Save size={15} /> : <CheckCircle2 size={15} />}
                    {draft.dirty ? 'تغییرات ذخیره‌نشده' : 'همگام با پاسخ ذخیره‌شده'}
                  </span>
                  <span>{draft.text.length.toLocaleString('fa-IR')} نویسه</span>
                </div>
                <div className={r.actions}>
                  <Button
                    variant="outline"
                    disabled={a.busy || fileBusy || !draft.ready || !draft.dirty}
                    onClick={async () => {
                      const result = await a.run<S['SubmissionAttemptResult']>(
                        `/api/v1/academic/submission-attempts/${value.id}/draft`,
                        { answerText: draft.text, expectedRowVersion: draft.baseVersion },
                        'PATCH',
                      );
                      if (result) {
                        draft.reset(result.answerText ?? '', result.rowVersion);
                        await reload();
                      }
                    }}
                  >
                    ذخیرهٔ پاسخ
                  </Button>
                  <Button
                    disabled={
                      a.busy ||
                      fileBusy ||
                      !draft.ready ||
                      !canReviewSubmission(value, draft.text, draft.dirty)
                    }
                    onClick={() => router.push(schoolRoutes.review(value.assignmentId) + query)}
                  >
                    بازبینی پاسخ
                  </Button>
                </div>
                <p className={s.hint}>
                  {draft.dirty
                    ? 'تغییرات شما هنوز در سرویس ذخیره نشده‌اند.'
                    : canReviewSubmission(value, draft.text, false)
                      ? 'پاسخ ذخیره‌شده آمادهٔ بازبینی است.'
                      : 'پاسخ متنی بنویسید یا عکس و PDF پیوست کنید.'}
                </p>
              </>
            ) : (
              <>
                <p className={r.reviewText} dir="auto">
                  {value.answerText || 'پاسخ متنی ندارد.'}
                </p>
                <p className={s.hint}>پس از تحویل نهایی، این پاسخ دیگر پیش‌نویس نیست.</p>
                <div className={r.actions}>
                  <Button asChild variant="outline">
                    <Link href={schoolRoutes.answer(value.assignmentId) + query}>
                      بازگشت و ویرایش پاسخ
                    </Link>
                  </Button>
                  <Button
                    disabled={
                      submitting ||
                      fileBusy ||
                      a.busy ||
                      !canReviewSubmission(value, value.answerText ?? '', false)
                    }
                    onClick={() => void submit()}
                  >
                    {submitting ? 'در حال بررسی و تحویل…' : 'تحویل نهایی تکلیف'}
                  </Button>
                </div>
              </>
            )}
            {a.feedback}
            {!!error && <ErrorState error={error} />}
          </section>
          <SubmissionFiles
            value={value}
            editable={stage === 'answer'}
            disabled={a.busy || !draft.ready || draft.dirty}
            onBusy={setFileBusy}
            onSaved={async (updated) => {
              draft.reset(updated.answerText ?? '', updated.rowVersion);
              await reload();
            }}
          />
        </div>
        <aside className={r.sidebar} aria-label="اطلاعات تکلیف">
          <AssignmentBrief value={value} />
          <section>
            <h2>وضعیت پاسخ</h2>
            <dl>
              <div>
                <dt>نوبت پاسخ</dt>
                <dd>{value.attemptNumber.toLocaleString('fa-IR')}</dd>
              </div>
              <div>
                <dt>پیوست‌ها</dt>
                <dd>{value.attachments.length.toLocaleString('fa-IR')} فایل</dd>
              </div>
              <div>
                <dt>وضعیت</dt>
                <dd>پیش‌نویس</dd>
              </div>
            </dl>
            <p className={r.note}>
              ذخیرهٔ پاسخ، تحویل نهایی نیست. بعد از بازبینی، «تحویل نهایی تکلیف» را بزنید تا رسید
              بگیرید.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AssignmentBrief({ value }: { value: S['SubmissionAttemptResult'] }) {
  const q = usePersonalApi<S['AssignmentResult']>(
    '/api/v1/academic/assignments/' + value.assignmentId,
  );
  return (
    <section>
      <h2>صورت تکلیف</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <strong>{q.data.title}</strong>
          <dl>
            <div>
              <dt>کلاس</dt>
              <dd>{q.data.classTitle}</dd>
            </div>
            <div>
              <dt>مهلت تحویل</dt>
              <dd>{date(q.data.dueAtUtc, true)}</dd>
            </div>
          </dl>
          {q.data.versionId === value.assignmentVersionId ? (
            <details>
              <summary>شرح تکلیف</summary>
              <p className={r.instructions} dir="auto">
                {q.data.description}
              </p>
            </details>
          ) : (
            <p className={r.muted}>
              نسخهٔ تکلیف تغییر کرده است؛ جزئیات نسخهٔ مربوط به پاسخ را از صفحهٔ تکلیف بررسی کنید.
            </p>
          )}
        </>
      )}
    </section>
  );
}
