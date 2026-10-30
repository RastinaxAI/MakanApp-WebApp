import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export type SubmissionStage = 'answer' | 'review' | 'receipt';
export function receiptFromAttempt(
  value: S['SubmissionAttemptResult'],
): S['SubmissionReceipt'] | undefined {
  if (value.status !== 'Submitted' || !value.submittedAtUtc || !value.contentVisible) return;
  return {
    submissionAttemptId: value.id,
    assignmentId: value.assignmentId,
    assignmentVersionId: value.assignmentVersionId,
    attemptNumber: value.attemptNumber,
    submittedAtUtc: value.submittedAtUtc,
    isLate: value.isLate,
    status: value.status,
    rowVersion: value.rowVersion,
  };
}
export function validSubmissionReceipt(
  value: S['SubmissionReceipt'],
  assignmentId: string,
  attemptId: string,
) {
  return (
    value.status === 'Submitted' &&
    value.assignmentId === assignmentId &&
    value.submissionAttemptId === attemptId &&
    Number.isFinite(Date.parse(value.submittedAtUtc))
  );
}
export function canReviewSubmission(
  value: S['SubmissionAttemptResult'],
  text: string,
  dirty: boolean,
) {
  return (
    value.contentVisible &&
    value.status === 'Draft' &&
    !dirty &&
    value.attachments.every((file) => file.fileStatus === 'Ready') &&
    (!!text.trim() || value.attachments.length > 0)
  );
}
export function matchesSubmission(
  value: S['SubmissionAttemptResult'],
  assignmentId: string,
  organizationId: string | null,
) {
  return (
    value.assignmentId === assignmentId &&
    value.organizationId === organizationId &&
    value.contentVisible
  );
}
