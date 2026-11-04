'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { ActivityDeliveryStatus } from './activity-delivery';
import s from './school.module.css';
import { Card, Field, SchoolHeading, Status, useSchoolAction } from './shared';
type S = components['schemas'];
export function Exams({ classId, teach }: { classId?: string; teach: boolean }) {
  const { base } = useAcademicScope();
  const q = usePersonalApi<S['StudentExamSummary'][]>('/api/v1/academic/exams');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', {
    enabled: teach && !classId,
  });
  const [chosen, setChosen] = useState(classId ?? '');
  const rows = q.data?.filter((exam) => !chosen || exam.classId === chosen);
  return (
    <>
      <SchoolHeading
        title={uiText.text_4f7293cf5780}
        description={uiText.text_484e7e05f519}
        action={
          teach &&
          chosen && (
            <Button asChild>
              <Link href={`${base}/classes/${chosen}/exams/new`}>{uiText.text_00f6d8e48e00}</Link>
            </Button>
          )
        }
      />
      {teach && !classId && (
        <Card>
          <Field label={uiText.text_36167d33608a}>
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">{uiText.text_e4f0b64f490d}</option>
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
                {exam.rules.durationMinutes}
                {uiText.text_1fb335d2caf7}
                {exam.rules.maxScore}
                {uiText.text_931d9d5a6b04}
                <br />
                {date(exam.rules.availableFromUtc, true)}
                {uiText.text_f6d897a5e343} {date(exam.rules.availableUntilUtc, true)}
              </p>
              <footer className={s.cardActions}>
                <Button asChild>
                  <Link
                    href={base + '/exams/' + exam.id + (teach ? '/edit' : '')}
                    aria-label={
                      (teach ? uiText.text_41b23f4e8fe0 : uiText.text_14ec971a7899) + exam.title
                    }
                  >
                    {teach ? uiText.text_dfe5265ec744 : uiText.text_f37ccc1e3278}
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title={uiText.text_ccb46171db2d}
            description={teach ? uiText.text_5bdcd0107bdf : uiText.text_b4e81abb82c3}
          />
        </Card>
      )}
    </>
  );
}
export function ExamEditor({ id }: { id: string }) {
  const scope = useAcademicScope();
  const { base } = useAcademicScope();
  const q = usePersonalApi<S['ExamEditorDto']>('/api/v1/academic/exams/' + id + '/editor');
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  if (!scope.matches(item)) return <ErrorState error={new ApiError(404)} />;
  return (
    <>
      <SchoolHeading
        title={item.title}
        description={item.classTitle + uiText.text_8125ff1a95fa}
        back
      />
      {!scope.personal && item.versionStatus === 'Published' && (
        <ActivityDeliveryStatus
          classId={item.classId}
          kind="Exam"
          sourceVersionId={item.versionId}
        />
      )}
      {(!scope.personal || scope.personal.grade) && (
        <Button variant="outline" asChild>
          <Link href={`${base}/exams/${id}/grading`}>{uiText.text_a6fc13e9473b}</Link>
        </Button>
      )}
      <Card>
        <div className={s.row}>
          <Status>{label(item.versionStatus)}</Status>
          <span>
            {item.durationMinutes}
            {uiText.text_5e2c83ade19c}
          </span>
          <span>
            {item.maxScore}
            {uiText.text_931d9d5a6b04}
          </span>
          <span>
            {item.questions.length}
            {uiText.text_5c2e40bca3fb}
          </span>
        </div>
        <p className={s.bodyText}>{item.description}</p>
        {item.versionStatus === 'Draft' && (
          <div className={s.row}>
            <Button asChild>
              <Link href={`${base}/exams/${id}/questions/new`}>{uiText.text_e109aef32077}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/exams/${id}/review`}>{uiText.text_eddf3e7e605e}</Link>
            </Button>
          </div>
        )}
      </Card>
      <Card title={uiText.text_795a6fe29020}>
        {item.questions.length ? (
          item.questions.map((question) => (
            <div className={s.question} key={question.id}>
              <div className={s.row}>
                <strong>
                  {uiText.text_649c0357f354}
                  {question.order}
                  {uiText.text_588da4105320}
                  {question.score}
                  {uiText.text_931d9d5a6b04}
                </strong>
                <Status>{label(question.type)}</Status>
              </div>
              <p className={s.bodyText}>{question.prompt}</p>
              {question.options.map((option) => (
                <p key={option.id} className={s.option}>
                  {option.text}
                  {option.isCorrect ? uiText.text_46c49ce8a96c : ''}
                </p>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title={uiText.text_a75c8aa4206a} />
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
      <Field label={uiText.text_36f2e5cc8da2}>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="Descriptive">{uiText.text_65f21708171c}</option>
          <option value="ObjectiveSingleChoice">{uiText.text_8fc194cdb8aa}</option>
        </select>
      </Field>
      <Field label={uiText.text_59612200f820}>
        <textarea name="prompt" required />
      </Field>
      <Field label={uiText.text_6672f1a95acb}>
        <input type="number" name="score" min={0} step="any" required />
      </Field>
      {type === 'Descriptive' && (
        <fieldset>
          <legend>{uiText.text_ed2595d209e5}</legend>
          <label>
            <input
              type="checkbox"
              checked={filesAllowed}
              onChange={(e) => setFilesAllowed(e.target.checked)}
            />{' '}
            {uiText.text_703606665166}
          </label>
          {filesAllowed && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={textRequired}
                  onChange={(e) => setTextRequired(e.target.checked)}
                />{' '}
                {uiText.text_aacb94b9f8cb}
              </label>
              <fieldset className={s.question}>
                <legend>{uiText.text_3a731fae4981}</legend>
                {(
                  [
                    ['application/pdf', 'PDF'],
                    ['image/jpeg', uiText.text_3ec90e9522ae],
                    ['image/png', uiText.text_bf8629a7be63],
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
                {!contentTypes.length && <p role="alert">{uiText.text_c1e5b4aacabd}</p>}
              </fieldset>
              <Field label={uiText.text_5b0f84fa02d1}>
                <input type="number" name="maximumCount" min={1} step={1} />
              </Field>
              <Field label={uiText.text_93b036d10054}>
                <input type="number" name="maximumMegabytes" min={1} step={1} />
              </Field>
            </>
          )}
        </fieldset>
      )}
      {type === 'ObjectiveSingleChoice' && (
        <>
          {[1, 2, 3, 4].map((n) => (
            <Field label={uiText.text_92d381e9e27f + n} key={n}>
              <input name={'option' + n} required />
            </Field>
          ))}
          <Field label={uiText.text_1ac128e79e40}>
            <select name="correct" required>
              <option value="">{uiText.text_e974ebd76aac}</option>
              {[1, 2, 3, 4].map((n) => (
                <option value={n} key={n}>
                  {uiText.text_92d381e9e27f}
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      <Button disabled={a.busy || (type === 'Descriptive' && filesAllowed && !contentTypes.length)}>
        {uiText.text_3366170495e9}
      </Button>
      {a.feedback}
    </form>
  );
}
export { StudentExam } from './exam-taking';
