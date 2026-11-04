'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePersonalApi } from '../provider';
import { ChevronRight, CheckCircle2, Clock3, FileCheck2, Save } from 'lucide-react';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { examClockLabel } from './exam-clock';
import { useExamClock } from './use-exam-clock';
import e from './exam-reference.module.css';
import { isMissingActiveAttempt } from './policy';
import s from './school.module.css';
import { ApiError } from '@/lib/api/errors';
import { examAnswerPresent, examAttachmentsValid } from '@/lib/exam-attachment';
import { ExamAnswerFiles, ExamFileDownload } from './exam-files';
import { Card, Field, SchoolHeading, useSchoolAction } from './shared';
type S = components['schemas'];

export function StudentExam({ id }: { id: string }) {
  const scope = useAcademicScope();
  const { base } = useAcademicScope();
  const q = usePersonalApi<S['StudentSafeExamPreview']>(
    '/api/v1/academic/exams/' + id + '/student-preview',
  );
  const current = usePersonalApi<S['StudentExamAttemptDto']>(
    '/api/v1/academic/exams/' + id + '/attempts/me/active',
  );
  const past = usePersonalApi<S['StudentExamAttemptSummaryDto'][]>(
    '/api/v1/academic/exams/' + id + '/attempts/me',
  );
  const [started, setStarted] = useState<S['StudentExamAttemptDto']>();
  // A background refresh of the known 404 must not briefly disable a live
  // start button between pointer-down/up. Start remains server-authorized.
  const startAllowed = useRef(false);
  if (current.isError) startAllowed.current = isMissingActiveAttempt(current.error);
  else if (current.isSuccess) startAllowed.current = false;
  const [operation] = useState(() => crypto.randomUUID());
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (scope.personal && !scope.matches(q.data.exam))
    return <ErrorState error={new ApiError(404)} />;
  const active = started ?? current.data;
  if (active && active.examId !== id) return <ErrorState error={new ApiError(502)} />;
  return (
    <>
      {!active && (
        <SchoolHeading title={q.data.exam.title} description={uiText.text_f5bf0241c376} back />
      )}
      {!active && (
        <Button asChild variant="outline">
          <Link href={`${base}/exams/${id}/history`}>{uiText.text_bdce5ddbe1d3}</Link>
        </Button>
      )}
      {active ? (
        <ExamAttempt key={active.examAttemptId} attempt={active} title={q.data.exam.title} />
      ) : (
        <Card>
          <p className={s.bodyText}>{q.data.exam.description}</p>
          <p className={s.hint}>
            {q.data.exam.rules.durationMinutes}
            {uiText.text_af5d165eb42a}
            {q.data.exam.rules.maxAttempts}
            {uiText.text_2c2981408a00} {q.data.exam.rules.maxScore}
            {uiText.text_931d9d5a6b04}
          </p>
          <p className={s.hint}>
            {date(q.data.exam.rules.availableFromUtc, true)}
            {uiText.text_f6d897a5e343} {date(q.data.exam.rules.availableUntilUtc, true)}
          </p>
          {current.isError && !isMissingActiveAttempt(current.error) && (
            <ErrorState error={current.error} />
          )}
          <Button
            disabled={
              a.busy ||
              !startAllowed.current ||
              !past.isSuccess ||
              past.data.length >= q.data.exam.rules.maxAttempts ||
              (current.isError && !isMissingActiveAttempt(current.error))
            }
            onClick={async () => {
              const result = await a.run<S['StudentExamAttemptDto']>(
                '/api/v1/academic/exams/' + id + '/attempts/start',
                { clientOperationId: operation },
              );
              if (result) setStarted(result);
            }}
          >
            {uiText.text_974bdfc23e33}
          </Button>
          {a.feedback}
        </Card>
      )}
      {past.isError && <ErrorState error={past.error} onRetry={() => void past.refetch()} />}
      {past.data
        ?.filter((item) => item.status === 'Finalized')
        .map((item) => (
          <PastExam key={item.examAttemptId} attempt={item} />
        ))}
    </>
  );
}
function PastExam({ attempt }: { attempt: S['StudentExamAttemptSummaryDto'] }) {
  const { base } = useAcademicScope();
  const a = useSchoolAction();
  const [receipt, setReceipt] = useState<S['ExamFinalReceiptDto']>();
  return (
    <Card title={uiText.text_135af069de25 + attempt.attemptNumber}>
      <Button asChild variant="outline">
        <Link href={`${base}/exam-submissions/${attempt.examAttemptId}/result`}>
          {uiText.text_4ccea8691b55}
        </Link>
      </Button>
      <p className={s.hint}>
        {uiText.text_d6a19d2e814a}
        {date(attempt.startedAtUtc, true)}
      </p>
      <Button
        variant="outline"
        disabled={a.busy}
        onClick={async () => {
          const result = await a.run<S['ExamFinalReceiptDto']>(
            '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/receipt',
            undefined,
            'GET',
          );
          if (result) setReceipt(result);
        }}
      >
        {uiText.text_95ff5b1021e8}
      </Button>
      {receipt && (
        <p role="status">
          {uiText.text_5abb68cbb3ee}
          {date(receipt.finalizedAtUtc, true)}
          {uiText.text_588da4105320}
          {receipt.answeredQuestionCount}
          {uiText.text_23d5cbc3c0e0}
          {receipt.totalQuestionCount}
          {uiText.text_5c2e40bca3fb}
        </p>
      )}
      {a.feedback}
    </Card>
  );
}
export function ExamAttempt({
  attempt,
  title = uiText.text_206d5b48e297,
}: {
  attempt: S['StudentExamAttemptDto'];
  title?: string;
}) {
  const { base } = useAcademicScope();
  const answers = usePersonalApi<S['StudentExamAnswersDto']>(
    '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/answers',
  );
  const [receipt, setReceipt] = useState<S['ExamFinalReceiptDto']>(),
    [lease, setLease] = useState<S['ExamWriteLeaseDto']>(),
    [dirty, setDirty] = useState<Record<string, boolean>>({}),
    [sync, setSync] = useState(0),
    [finalizing, setFinalizing] = useState(false),
    [index, setIndex] = useState(0),
    [review, setReview] = useState(false);
  const a = useSchoolAction(),
    finalCommand = useRef<S['FinalizeExamCommand'] | undefined>(undefined);
  const writer = lease ?? answers.data?.writeLease;
  const seconds = useExamClock(
    attempt.effectiveDeadlineUtc,
    writer?.serverNowUtc ?? attempt.serverNowUtc,
  );
  const hasDirty = Object.values(dirty).some(Boolean);
  useUnsavedChanges(hasDirty && !receipt);
  const savedCount = attempt.questions.filter((question) =>
    answers.data?.answers.some(
      (answer) =>
        answer.examAttemptQuestionId === question.attemptQuestionId &&
        examAnswerPresent(question, answer),
    ),
  ).length;
  const validAttachments = attempt.questions.every((q) =>
    examAttachmentsValid(
      q,
      answers.data?.answers.find((a) => a.examAttemptQuestionId === q.attemptQuestionId),
    ),
  );
  if (receipt)
    return (
      <div className={s.receipt}>
        <h2>{uiText.text_003f88cafd19}</h2>
        <p>
          {receipt.answeredQuestionCount}
          {uiText.text_23d5cbc3c0e0}
          {receipt.totalQuestionCount}
          {uiText.text_5c2e40bca3fb}
        </p>
        <p>{date(receipt.finalizedAtUtc, true)}</p>
        <PageBack href={base + '/exams'} />
      </div>
    );
  return (
    <div className={e.stage} data-exam-room>
      <header className={e.header}>
        <Link href={base + '/exams'} aria-label={uiText.text_2a9639fad252}>
          <ChevronRight size={20} />
        </Link>
        <h1>{title}</h1>
        <div
          className={e.timer}
          data-exam-timer
          data-urgent={seconds !== null && seconds <= 300}
          role="timer"
          aria-label={uiText.text_260462be74d1}
        >
          <Clock3 size={20} />
          <span>
            <small>{uiText.text_05323c282dc5}</small>
            <strong dir="ltr">{seconds === null ? '—' : examClockLabel(seconds)}</strong>
          </span>
        </div>
      </header>
      <div className={e.content}>
        <div className={e.layout}>
          <div className={e.mainColumn}>
            <section className={e.examPanel}>
              <div className={e.progress}>
                <strong>
                  {review
                    ? uiText.text_b90491b0d105
                    : uiText.format_63f311d97e40(
                        (index + 1).toLocaleString('fa-IR'),
                        attempt.questions.length.toLocaleString('fa-IR'),
                      )}
                </strong>
                <span>
                  {savedCount.toLocaleString('fa-IR')}
                  {uiText.text_1dfb2d843a4b}
                </span>
              </div>
              {seconds === null && (
                <p role="alert" className={s.notice}>
                  {uiText.text_1e55b02eb966}
                </p>
              )}
              {seconds === 0 && <p className={s.notice}>{uiText.text_b3bf53045bdc}</p>}
              {answers.isPending ? (
                <LoadingSkeleton />
              ) : answers.isError ? (
                <ErrorState error={answers.error} onRetry={() => void answers.refetch()} />
              ) : (
                <>
                  {!writer?.isCurrentSessionWriter && (
                    <>
                      <p className={s.notice}>{uiText.text_eb7524c89b59}</p>
                      <Button
                        disabled={a.busy || !seconds || attempt.status !== 'InProgress'}
                        onClick={async () => {
                          const result = await a.run<S['ExamWriteLeaseDto']>(
                            '/api/v1/academic/exam-attempts/' +
                              attempt.examAttemptId +
                              '/write-lease',
                          );
                          if (result) setLease(result);
                        }}
                      >
                        {uiText.text_0368f96b438f}
                      </Button>
                    </>
                  )}
                  <details className={e.sync}>
                    <summary>{uiText.text_cb2f84efe820}</summary>
                    <Button
                      variant="outline"
                      disabled={a.busy || finalizing}
                      onClick={async () => {
                        if (hasDirty && !window.confirm(uiText.text_e4bc4f41bf23)) return;
                        const fresh = await answers.refetch();
                        if (fresh.isSuccess) {
                          setLease(undefined);
                          setDirty({});
                          setSync((n) => n + 1);
                        }
                      }}
                    >
                      {uiText.text_3c4e01e958ec}
                    </Button>
                  </details>
                </>
              )}
              {a.feedback}

              {answers.data &&
                attempt.questions.map((question, i) => (
                  <div
                    key={question.attemptQuestionId}
                    className={e.questionContainer}
                    hidden={review || index !== i}
                  >
                    <ExamQuestion
                      key={question.attemptQuestionId + ':' + sync}
                      question={question}
                      number={i + 1}
                      attemptId={attempt.examAttemptId}
                      saved={answers.data.answers.find(
                        (answer) => answer.examAttemptQuestionId === question.attemptQuestionId,
                      )}
                      lease={writer}
                      disabled={
                        !seconds ||
                        !writer?.isCurrentSessionWriter ||
                        attempt.status !== 'InProgress' ||
                        finalizing
                      }
                      onDirty={(value) =>
                        setDirty((old) =>
                          old[question.attemptQuestionId] === value
                            ? old
                            : { ...old, [question.attemptQuestionId]: value },
                        )
                      }
                      onSaved={async () => {
                        setLease(undefined);
                        const fresh = await answers.refetch();
                        if (fresh.isError) throw fresh.error;
                      }}
                    />
                  </div>
                ))}
              {answers.data && (
                <div className={e.review} hidden={!review}>
                  <h2>{uiText.text_b90491b0d105}</h2>
                  {!validAttachments && <p role="alert">{uiText.text_ada70c7f74e9}</p>}
                  <p className={s.hint}>{uiText.text_1fa88a22344c}</p>
                  <div className={e.reviewSummary}>
                    <FileCheck2 size={24} />
                    <span>
                      <strong>
                        {savedCount.toLocaleString('fa-IR')}
                        {uiText.text_8d6ea6982b74}{' '}
                        {attempt.questions.length.toLocaleString('fa-IR')}
                        {uiText.text_c29fedbad608}
                      </strong>
                      <small>{uiText.text_e7fd700f0cb0}</small>
                    </span>
                  </div>
                  {attempt.questions.map((question, i) => {
                    const answer = answers.data?.answers.find(
                      (item) => item.examAttemptQuestionId === question.attemptQuestionId,
                    );
                    const text =
                      question.questionType === 'Descriptive'
                        ? answer?.textAnswer
                        : question.options.find((option) => option.id === answer?.selectedOptionId)
                            ?.text;
                    return (
                      <article key={question.attemptQuestionId} className={e.reviewItem}>
                        <div>
                          <strong>
                            {uiText.text_649c0357f354}
                            {(i + 1).toLocaleString('fa-IR')}
                          </strong>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIndex(i);
                              setReview(false);
                            }}
                          >
                            {uiText.text_7b83fe622ee7}
                            {(i + 1).toLocaleString('fa-IR')}
                          </Button>
                        </div>
                        <p dir="auto">
                          {text?.trim() ||
                            (answer?.attachments?.length
                              ? uiText.text_64ebb8942651
                              : uiText.text_d1decdf85c3b)}
                        </p>
                        {dirty[question.attemptQuestionId] && (
                          <small>{uiText.text_c7936aa549f3}</small>
                        )}
                        {answer?.attachments?.map((file) => (
                          <ExamFileDownload
                            key={file.fileAssetId}
                            attemptId={attempt.examAttemptId}
                            questionId={question.attemptQuestionId}
                            file={file}
                          />
                        ))}
                      </article>
                    );
                  })}
                  {hasDirty && (
                    <p role="status" className={s.notice}>
                      {uiText.text_d0c32833d55f}
                    </p>
                  )}
                  <Button
                    disabled={
                      a.busy ||
                      hasDirty ||
                      !validAttachments ||
                      !writer?.isCurrentSessionWriter ||
                      attempt.status !== 'InProgress'
                    }
                    onClick={async () => {
                      if (!answers.data || !writer) return;
                      setFinalizing(true);
                      finalCommand.current ??= {
                        clientOperationId: crypto.randomUUID(),
                        expectedAnswerSetVersion: answers.data.answerSetVersion,
                        writeLeaseVersion: writer.writeLeaseVersion,
                      };
                      const result = await a.run<S['ExamFinalReceiptDto']>(
                        '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/finalize',
                        finalCommand.current,
                      );
                      if (result) setReceipt(result);
                    }}
                  >
                    {finalizing ? uiText.text_887583bed820 : uiText.text_9e3a00bd25d6}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={a.busy}
                    onClick={async () => {
                      const result = await a.run<S['ExamFinalReceiptDto']>(
                        '/api/v1/academic/exam-attempts/' + attempt.examAttemptId + '/receipt',
                        undefined,
                        'GET',
                      );
                      if (result) setReceipt(result);
                    }}
                  >
                    {uiText.text_b000b2b3ef87}
                  </Button>
                </div>
              )}
            </section>
          </div>
          <aside className={e.sidebar} aria-label={uiText.text_37f16de1385c}>
            <section className={e.navigator}>
              <h2>{uiText.text_37f16de1385c}</h2>
              <p>
                {savedCount.toLocaleString('fa-IR')}
                {uiText.text_cf2bfba20bfc} {attempt.questions.length.toLocaleString('fa-IR')}
                {uiText.text_5c2e40bca3fb}
              </p>
              <div className={e.questionGrid}>
                {attempt.questions.map((question, i) => {
                  const saved = answers.data?.answers.some(
                    (answer) =>
                      answer.examAttemptQuestionId === question.attemptQuestionId &&
                      examAnswerPresent(question, answer),
                  );
                  const state = dirty[question.attemptQuestionId]
                    ? 'dirty'
                    : saved
                      ? 'saved'
                      : 'empty';
                  return (
                    <button
                      key={question.attemptQuestionId}
                      type="button"
                      data-state={state}
                      aria-current={!review && index === i ? 'step' : undefined}
                      aria-label={uiText.format_21050785023d(
                        (i + 1).toLocaleString('fa-IR'),
                        state === 'dirty'
                          ? uiText.text_17e99e000a84
                          : state === 'saved'
                            ? uiText.text_7d24bb2778c3
                            : uiText.text_431772a570a9,
                      )}
                      onClick={() => {
                        setIndex(i);
                        setReview(false);
                      }}
                    >
                      {(i + 1).toLocaleString('fa-IR')}
                    </button>
                  );
                })}
              </div>
              <div className={e.legend}>
                <span data-state="saved">{uiText.text_7d24bb2778c3}</span>
                <span data-state="dirty">{uiText.text_17e99e000a84}</span>
                <span>{uiText.text_431772a570a9}</span>
              </div>
            </section>
            <section className={e.navigator}>
              <h2>{uiText.text_698330b28e93}</h2>
              <p>{uiText.text_ec6cacb8d486}</p>
              <p>
                {uiText.text_7e8130682096}
                {date(attempt.effectiveDeadlineUtc, true)}
              </p>
              <Button variant="outline" onClick={() => setReview(true)}>
                {uiText.text_b90491b0d105}
              </Button>
            </section>
          </aside>
        </div>
      </div>
      <footer className={e.footer}>
        {review ? (
          <Button variant="outline" onClick={() => setReview(false)}>
            {uiText.text_3613801e807e}
          </Button>
        ) : (
          <>
            <Button
              onClick={() =>
                index < attempt.questions.length - 1 ? setIndex(index + 1) : setReview(true)
              }
            >
              {index < attempt.questions.length - 1
                ? uiText.text_906e0c72a3b4
                : uiText.text_2dd10ba71f63}
            </Button>
            {index > 0 && (
              <Button variant="ghost" onClick={() => setIndex(index - 1)}>
                {uiText.text_8904de0bfc67}
              </Button>
            )}
          </>
        )}
      </footer>
    </div>
  );
}
function ExamQuestion({
  question,
  number,
  attemptId,
  saved,
  lease,
  disabled,
  onSaved,
  onDirty,
}: {
  question: S['StudentExamAttemptQuestionDto'];
  number: number;
  attemptId: string;
  saved?: S['StudentCurrentExamAnswerDto'];
  lease?: S['ExamWriteLeaseDto'];
  disabled: boolean;
  onSaved: () => Promise<void>;
  onDirty: (value: boolean) => void;
}) {
  const [text, setText] = useState(saved?.textAnswer ?? ''),
    [option, setOption] = useState(saved?.selectedOptionId ?? ''),
    [uncertain, setUncertain] = useState(false),
    [filePending, setFilePending] = useState(false);
  const command = useRef<S['SaveExamAnswerCommand'] | undefined>(undefined);
  const a = useSchoolAction();
  const dirty =
    question.questionType === 'Descriptive'
      ? text !== (saved?.textAnswer ?? '')
      : option !== (saved?.selectedOptionId ?? '');
  useEffect(() => {
    onDirty(dirty || a.busy || uncertain || filePending);
  }, [dirty, a.busy, uncertain, filePending]);
  return (
    <section data-exam-question>
      <div className={e.questionMeta}>
        <span>
          {uiText.text_649c0357f354}
          {number.toLocaleString('fa-IR')}
          {uiText.text_78887da22764}{' '}
          {question.questionType === 'Descriptive'
            ? uiText.text_65f21708171c
            : uiText.text_8fc194cdb8aa}
        </span>
        <span>
          {question.score.toLocaleString('fa-IR')}
          {uiText.text_931d9d5a6b04}
        </span>
      </div>
      {saved && !dirty && !a.busy && (
        <p className={e.saved} role="status">
          <CheckCircle2 size={17} />
          {uiText.text_8b4c29b1f0f6}
        </p>
      )}
      <p className={e.prompt}>
        {question.prompt
          .split('\n')
          .filter((line) => !(/^[\dx+\-*/=().\s]+$/i.test(line) && line.includes('=')))
          .join('\n')}
      </p>
      {question.prompt
        .split('\n')
        .filter((line) => /^[\dx+\-*/=().\s]+$/i.test(line) && line.includes('='))
        .map((line, i) => (
          <div key={i} className={e.equation} dir="ltr">
            {line}
          </div>
        ))}
      {question.questionType === 'Descriptive' ? (
        <div>
          <Field label={uiText.text_31e133b70dc2 + number}>
            <textarea
              disabled={disabled || a.busy || uncertain || filePending}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={uiText.text_59ca5495819c}
            />
          </Field>
          <ExamAnswerFiles
            attemptId={attemptId}
            questionId={question.attemptQuestionId}
            policy={question.attachmentPolicy ?? null}
            files={saved?.attachments ?? []}
            revision={saved?.revisionNumber ?? null}
            lease={lease}
            disabled={disabled || dirty || a.busy || uncertain}
            onSaved={onSaved}
            onPending={setFilePending}
          />
        </div>
      ) : (
        <fieldset className={s.question}>
          <legend>{uiText.text_0861b9a398f9}</legend>
          {question.options.map((item) => (
            <label className={s.option} key={item.id}>
              <input
                name={question.attemptQuestionId}
                type="radio"
                value={item.id}
                checked={option === item.id}
                disabled={disabled || a.busy || uncertain}
                onChange={() => setOption(item.id)}
              />
              {item.text}
            </label>
          ))}
        </fieldset>
      )}
      <Button
        disabled={disabled || a.busy || filePending || (!dirty && !uncertain)}
        onClick={async () => {
          if (!lease) return;
          command.current ??= {
            clientOperationId: crypto.randomUUID(),
            writeLeaseVersion: lease.writeLeaseVersion,
            expectedRevisionNumber: saved?.revisionNumber ?? null,
            selectedOptionId:
              question.questionType === 'ObjectiveSingleChoice' ? option || null : null,
            textAnswer: question.questionType === 'Descriptive' ? text : null,
          };
          const result = await a.run<S['ExamAnswerReceiptDto']>(
            '/api/v1/academic/exam-attempts/' +
              attemptId +
              '/answers/' +
              question.attemptQuestionId,
            command.current,
            'PUT',
          );
          if (result) {
            try {
              await onSaved();
              command.current = undefined;
              setUncertain(false);
            } catch {
              setUncertain(true);
            }
          } else setUncertain(true);
        }}
      >
        <Save size={18} />
        {a.busy
          ? uiText.text_a143258455bb
          : uncertain
            ? uiText.text_16009dd36439
            : uiText.text_7ed2fc6e7f87 + number}
      </Button>
      {uncertain && <p className={s.hint}>{uiText.text_a54c150e64e9}</p>}
      {!!a.error && a.feedback}
    </section>
  );
}
