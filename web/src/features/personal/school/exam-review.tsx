'use client';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import { usePersonal, usePersonalApi } from '../provider';
import { WorkflowPage } from './workflow';
import { ActivityDeliveryStatus } from './activity-delivery';
import { base } from './shared';
import s from './school.module.css';
export function ExamReviewPage({ id }: { id: string }) {
  return (
    <WorkflowPage
      title="بازبینی و انتشار آزمون"
      roles={['Teacher', 'Manager']}
      back={`${base}/exams/${id}/edit`}
    >
      <ExamReview id={id} />
    </WorkflowPage>
  );
}
function ExamReview({ id }: { id: string }) {
  const q = usePersonalApi<components['schemas']['ExamEditorDto']>(
      `/api/v1/academic/exams/${id}/editor`,
    ),
    { call, session } = usePersonal();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  if (item.organizationId !== session.context.organizationId)
    return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <section className={s.card}>
        <h2>{item.title}</h2>
        <p className={s.hint}>{item.classTitle}</p>
        <dl className={s.summary}>
          {[
            ['آغاز دسترسی', date(item.availableFromUtc, true)],
            ['پایان دسترسی', date(item.availableUntilUtc, true)],
            ['مدت', item.durationMinutes.toLocaleString('fa-IR') + ' دقیقه'],
            ['دفعات شرکت', item.maxAttempts.toLocaleString('fa-IR')],
            ['نمرهٔ کل', item.maxScore.toLocaleString('fa-IR')],
          ].map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {item.versionStatus === 'Draft' ? (
          <ConfirmAction
            trigger="انتشار آزمون برای کلاس"
            title="انتشار این نسخهٔ آزمون؟"
            description="شرایط و سؤال‌ها را بررسی کنید. انتشار نسخه، آن را در دسترس افراد مجاز کلاس قرار می‌دهد."
            confirm="تأیید انتشار آزمون"
            disabled={!item.questions.length}
            onConfirm={async () => {
              await call(`/api/v1/academic/exams/${id}/publish`, {
                method: 'POST',
                body: JSON.stringify({
                  expectedExamRowVersion: item.examRowVersion,
                  expectedVersionRowVersion: item.versionRowVersion,
                }),
              });
              await q.refetch();
              return true;
            }}
          />
        ) : (
          <p role="status" className={s.notice}>
            این نسخهٔ آزمون منتشر شده است.
          </p>
        )}
      </section>
      {item.versionStatus === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Exam"
          sourceVersionId={item.versionId}
        />
      )}
      <section className={s.card}>
        <h2>پرسش‌ها و پاسخ‌های ارزیابی</h2>
        <p className={s.hint}>
          این پیش‌نمایش مخصوص نویسنده است؛ پاسخ درست در پاسخ‌نامهٔ دانش‌آموز نمایش داده نمی‌شود.
        </p>
        {item.questions.map((question, i) => (
          <article key={question.id} className={s.question}>
            <h3>
              پرسش {(i + 1).toLocaleString('fa-IR')} · {question.score.toLocaleString('fa-IR')} نمره
            </h3>
            <p className={s.bodyText} dir="auto">
              {question.prompt}
            </p>
            {question.options.map((option) => (
              <p key={option.id}>
                {option.text}
                {option.isCorrect ? ' — پاسخ درست' : ''}
              </p>
            ))}
          </article>
        ))}
      </section>
    </>
  );
}
