'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { useState } from 'react';
import { PublicationReceipt } from './publication-receipt';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import { usePersonal, usePersonalApi } from '../provider';
import { WorkflowPage } from './workflow';
import { ActivityDeliveryStatus } from './activity-delivery';
import s from './school.module.css';
export function ExamReviewPage({ id }: { id: string }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={uiText.text_eddf3e7e605e}
      roles={['Teacher', 'Manager']}
      back={`${base}/exams/${id}/edit`}
    >
      <ExamReview id={id} />
    </WorkflowPage>
  );
}
function ExamReview({ id }: { id: string }) {
  const [receipt, setReceipt] = useState<components['schemas']['AcademicPublicationReceipt']>();
  const q = usePersonalApi<components['schemas']['ExamEditorDto']>(
      `/api/v1/academic/exams/${id}/editor`,
    ),
    { call } = usePersonal();
  const scope = useAcademicScope();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  if (!scope.matches(item)) return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <section className={s.card}>
        <h2>{item.title}</h2>
        <p className={s.hint}>{item.classTitle}</p>
        <dl className={s.summary}>
          {[
            [uiText.text_8ea5a5c720cd, date(item.availableFromUtc, true)],
            [uiText.text_5cff509ed1c9, date(item.availableUntilUtc, true)],
            [
              uiText.text_611e211b9254,
              item.durationMinutes.toLocaleString('fa-IR') + uiText.text_5e2c83ade19c,
            ],
            [uiText.text_0fe100cdea24, item.maxAttempts.toLocaleString('fa-IR')],
            [uiText.text_25823dfdfd3f, item.maxScore.toLocaleString('fa-IR')],
          ].map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {item.versionStatus === 'Draft' ? (
          <ConfirmAction
            trigger={uiText.text_12dfa243b33e}
            title={uiText.text_08aa67bbee2a}
            description={uiText.text_d5b25400556e}
            confirm={uiText.text_e689b082a308}
            disabled={!item.questions.length}
            onConfirm={async () => {
              const result = await call<components['schemas']['ExamEditorDto']>(
                `/api/v1/academic/exams/${id}/publish`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    expectedExamRowVersion: item.examRowVersion,
                    expectedVersionRowVersion: item.versionRowVersion,
                  }),
                },
              );
              setReceipt(result.publicationReceipt);
              await q.refetch();
              return true;
            }}
          />
        ) : (
          <p role="status" className={s.notice}>
            {uiText.text_94f6599576df}
          </p>
        )}
      </section>
      <PublicationReceipt value={receipt} />
      {!scope.personal && item.versionStatus === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Exam"
          sourceVersionId={item.versionId}
        />
      )}
      <section className={s.card}>
        <h2>{uiText.text_db44a1fe2fd1}</h2>
        <p className={s.hint}>{uiText.text_abefd1a02a01}</p>
        {item.questions.map((question, i) => (
          <article key={question.id} className={s.question}>
            <h3>
              {uiText.text_649c0357f354}
              {(i + 1).toLocaleString('fa-IR')}
              {uiText.text_588da4105320}
              {question.score.toLocaleString('fa-IR')}
              {uiText.text_931d9d5a6b04}
            </h3>
            <p className={s.bodyText} dir="auto">
              {question.prompt}
            </p>
            {question.options.map((option) => (
              <p key={option.id}>
                {option.text}
                {option.isCorrect ? uiText.text_149568c03aa5 : ''}
              </p>
            ))}
          </article>
        ))}
      </section>
    </>
  );
}
