'use client';
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
import { examAnswerPresent, examAttachmentsValid } from '@/lib/exam-attachment';
import { ExamAnswerFiles, ExamFileDownload } from './exam-files';
import { base, Card, Field, SchoolHeading, useSchoolAction } from './shared';
type S = components['schemas'];

export function StudentExam({ id }: { id: string }) {
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
  const active = started ?? current.data;
  return (
    <>
      {!active && <SchoolHeading title={q.data.exam.title} description="آزمون دانش‌آموز" back />}
      {!active && (
        <Button asChild variant="outline">
          <Link href={`${base}/exams/${id}/history`}>سابقهٔ تلاش‌ها و نتایج</Link>
        </Button>
      )}
      {active ? (
        <ExamAttempt key={active.examAttemptId} attempt={active} title={q.data.exam.title} />
      ) : (
        <Card>
          <p className={s.bodyText}>{q.data.exam.description}</p>
          <p className={s.hint}>
            {q.data.exam.rules.durationMinutes} دقیقه · حداکثر {q.data.exam.rules.maxAttempts} بار ·{' '}
            {q.data.exam.rules.maxScore} نمره
          </p>
          <p className={s.hint}>
            {date(q.data.exam.rules.availableFromUtc, true)} تا{' '}
            {date(q.data.exam.rules.availableUntilUtc, true)}
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
            شروع آزمون
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
  const a = useSchoolAction();
  const [receipt, setReceipt] = useState<S['ExamFinalReceiptDto']>();
  return (
    <Card title={'آزمون ثبت‌شده · نوبت ' + attempt.attemptNumber}>
      <Button asChild variant="outline">
        <Link href={`${base}/exam-submissions/${attempt.examAttemptId}/result`}>
          مشاهدهٔ وضعیت نتیجه
        </Link>
      </Button>
      <p className={s.hint}>شروع: {date(attempt.startedAtUtc, true)}</p>
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
        مشاهدهٔ رسید ثبت آزمون
      </Button>
      {receipt && (
        <p role="status">
          ثبت نهایی در {date(receipt.finalizedAtUtc, true)} · {receipt.answeredQuestionCount} پاسخ
          از {receipt.totalQuestionCount} پرسش
        </p>
      )}
      {a.feedback}
    </Card>
  );
}
export function ExamAttempt({
  attempt,
  title = 'آزمون',
}: {
  attempt: S['StudentExamAttemptDto'];
  title?: string;
}) {
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
        <h2>آزمون ثبت نهایی شد</h2>
        <p>
          {receipt.answeredQuestionCount} پاسخ از {receipt.totalQuestionCount} پرسش
        </p>
        <p>{date(receipt.finalizedAtUtc, true)}</p>
        <PageBack href={base + '/exams'} />
      </div>
    );
  return (
    <div className={e.stage} data-exam-room>
      <header className={e.header}>
        <Link href={base + '/exams'} aria-label="بازگشت به آزمون‌ها">
          <ChevronRight size={20} />
        </Link>
        <h1>{title}</h1>
        <div
          className={e.timer}
          data-exam-timer
          data-urgent={seconds !== null && seconds <= 300}
          role="timer"
          aria-label="زمان باقی‌ماندهٔ آزمون"
        >
          <Clock3 size={20} />
          <span>
            <small>زمان باقی‌مانده</small>
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
                    ? 'مرور و تحویل آزمون'
                    : `سؤال ${(index + 1).toLocaleString('fa-IR')} از ${attempt.questions.length.toLocaleString('fa-IR')}`}
                </strong>
                <span>{savedCount.toLocaleString('fa-IR')} پاسخ ذخیره‌شده</span>
              </div>
              {seconds === null && (
                <p role="alert" className={s.notice}>
                  زمان معتبر آزمون دریافت نشد. برای ادامه، وضعیت آزمون را دوباره دریافت کنید.
                </p>
              )}
              {seconds === 0 && (
                <p className={s.notice}>
                  زمان پاسخ‌دهی به پایان رسیده است. وضعیت نهایی را از سرور بازخوانی کنید.
                </p>
              )}
              {answers.isPending ? (
                <LoadingSkeleton />
              ) : answers.isError ? (
                <ErrorState error={answers.error} onRetry={() => void answers.refetch()} />
              ) : (
                <>
                  {!writer?.isCurrentSessionWriter && (
                    <>
                      <p className={s.notice}>
                        برای پاسخ‌دادن، نوشتن در همین دستگاه باید فعال باشد. کنترل پاسخ‌دهی دستگاه
                        دیگر خودکار منتقل نمی‌شود.
                      </p>
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
                        فعال‌کردن پاسخ‌دهی در این دستگاه
                      </Button>
                    </>
                  )}
                  <details className={e.sync}>
                    <summary>وضعیت ذخیرهٔ پاسخ‌ها</summary>
                    <Button
                      variant="outline"
                      disabled={a.busy || finalizing}
                      onClick={async () => {
                        if (
                          hasDirty &&
                          !window.confirm('پاسخ‌های ذخیره‌نشده با نسخهٔ سرور جایگزین شوند؟')
                        )
                          return;
                        const fresh = await answers.refetch();
                        if (fresh.isSuccess) {
                          setLease(undefined);
                          setDirty({});
                          setSync((n) => n + 1);
                        }
                      }}
                    >
                      بازخوانی پاسخ‌های ثبت‌شده
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
                  <h2>مرور و تحویل آزمون</h2>
                  {!validAttachments && (
                    <p role="alert">
                      پیوست آماده‌نشده یا متن الزامیِ ثبت‌نشده وجود دارد؛ پاسخ را اصلاح کنید.
                    </p>
                  )}
                  <p className={s.hint}>
                    فقط پاسخ‌هایی که ذخیره شده‌اند ثبت نهایی می‌شوند. پس از ثبت نهایی امکان تغییر
                    پاسخ وجود ندارد.
                  </p>
                  <div className={e.reviewSummary}>
                    <FileCheck2 size={24} />
                    <span>
                      <strong>
                        {savedCount.toLocaleString('fa-IR')} از{' '}
                        {attempt.questions.length.toLocaleString('fa-IR')} پاسخ ذخیره شده
                      </strong>
                      <small>پاسخ‌های زیر نسخهٔ ثبت‌شده در سرویس هستند.</small>
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
                          <strong>پرسش {(i + 1).toLocaleString('fa-IR')}</strong>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIndex(i);
                              setReview(false);
                            }}
                          >
                            مشاهدهٔ پرسش {(i + 1).toLocaleString('fa-IR')}
                          </Button>
                        </div>
                        <p dir="auto">
                          {text?.trim() ||
                            (answer?.attachments?.length
                              ? 'پاسخ پیوست‌شده'
                              : 'پاسخی ذخیره نشده است.')}
                        </p>
                        {dirty[question.attemptQuestionId] && <small>تغییر ذخیره‌نشده دارد.</small>}
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
                      پاسخ ذخیره‌نشده دارید؛ ابتدا آن‌ها را ذخیره کنید.
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
                    {finalizing ? 'تلاش مجدد برای ثبت نهایی' : 'ثبت نهایی آزمون'}
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
                    بررسی رسید نهایی
                  </Button>
                </div>
              )}
            </section>
          </div>
          <aside className={e.sidebar} aria-label="پاسخ‌برگ آزمون">
            <section className={e.navigator}>
              <h2>پاسخ‌برگ آزمون</h2>
              <p>
                {savedCount.toLocaleString('fa-IR')} پاسخ ذخیره‌شده از{' '}
                {attempt.questions.length.toLocaleString('fa-IR')} پرسش
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
                      aria-label={`رفتن به پرسش ${(i + 1).toLocaleString('fa-IR')}؛ ${state === 'dirty' ? 'ذخیره‌نشده' : state === 'saved' ? 'ذخیره‌شده' : 'بی‌پاسخ'}`}
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
                <span data-state="saved">ذخیره‌شده</span>
                <span data-state="dirty">ذخیره‌نشده</span>
                <span>بی‌پاسخ</span>
              </div>
            </section>
            <section className={e.navigator}>
              <h2>پیش از تحویل</h2>
              <p>
                پاسخ هر پرسش را ذخیره کنید. در پایان، پاسخ‌ها را مرور و آزمون را ثبت نهایی کنید.
              </p>
              <p>پایان مهلت: {date(attempt.effectiveDeadlineUtc, true)}</p>
              <Button variant="outline" onClick={() => setReview(true)}>
                مرور و تحویل آزمون
              </Button>
            </section>
          </aside>
        </div>
      </div>
      <footer className={e.footer}>
        {review ? (
          <Button variant="outline" onClick={() => setReview(false)}>
            بازگشت به پاسخ‌ها
          </Button>
        ) : (
          <>
            <Button
              onClick={() =>
                index < attempt.questions.length - 1 ? setIndex(index + 1) : setReview(true)
              }
            >
              {index < attempt.questions.length - 1 ? 'سؤال بعد' : 'مرور پاسخ‌ها'}
            </Button>
            {index > 0 && (
              <Button variant="ghost" onClick={() => setIndex(index - 1)}>
                سؤال قبل
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
          پرسش {number.toLocaleString('fa-IR')} ·{' '}
          {question.questionType === 'Descriptive' ? 'تشریحی' : 'چهارگزینه‌ای'}
        </span>
        <span>{question.score.toLocaleString('fa-IR')} نمره</span>
      </div>
      {saved && !dirty && !a.busy && (
        <p className={e.saved} role="status">
          <CheckCircle2 size={17} />
          آخرین پاسخ ذخیره شد.
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
          <Field label={'پاسخ پرسش ' + number}>
            <textarea
              disabled={disabled || a.busy || uncertain || filePending}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پاسخ خود را اینجا بنویسید…"
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
          <legend>یک گزینه انتخاب کنید</legend>
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
          ? 'در حال ذخیره…'
          : uncertain
            ? 'تلاش مجدد برای همین پاسخ'
            : 'ذخیرهٔ پاسخ ' + number}
      </Button>
      {uncertain && (
        <p className={s.hint}>
          نتیجهٔ ذخیره تأیید نشد؛ همین درخواست را تکرار کنید یا پاسخ‌های ثبت‌شده را بازخوانی کنید.
        </p>
      )}
      {!!a.error && a.feedback}
    </section>
  );
}
