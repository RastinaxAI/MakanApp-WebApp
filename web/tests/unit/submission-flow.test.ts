import { describe, it, expect } from 'vitest';
import {
  canReviewSubmission,
  matchesSubmission,
  receiptFromAttempt,
  validSubmissionReceipt,
} from '@/features/personal/school/submission-model';
import type { components } from '@/generated/api/schema';
const value = {
  id: 'attempt',
  assignmentId: 'assignment',
  organizationId: 'org',
  status: 'Draft',
  contentVisible: true,
  answerText: 'پاسخ ذخیره‌شده',
  attachments: [],
  submittedAtUtc: null,
  assignmentVersionId: 'version',
  attemptNumber: 1,
  isLate: false,
  rowVersion: 'v1',
  assignmentRecipientId: 'recipient',
  enrollmentId: 'enrollment',
  createdAtUtc: '2026-10-29T10:00:00Z',
  lastSavedAtUtc: null,
} satisfies components['schemas']['SubmissionAttemptResult'];
describe('S09 review and server-confirmed receipt', () => {
  it('requires visible, persisted nonempty content before review', () => {
    expect(canReviewSubmission(value, value.answerText, false)).toBe(true);
    expect(canReviewSubmission(value, 'unsaved', true)).toBe(false);
    expect(canReviewSubmission({ ...value, contentVisible: false }, 'text', false)).toBe(false);
    expect(canReviewSubmission(value, '  ', false)).toBe(false);
  });
  it('does not allow pending or rejected attachment content to enter final review', () => {
    const file = {
      fileAssetId: 'file',
      originalFileName: 'answer.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1,
      attachedAtUtc: '2026-10-29T10:00:00Z',
      fileStatus: 'Pending' as const,
    };
    expect(canReviewSubmission({ ...value, attachments: [file] }, 'saved text', false)).toBe(false);
    expect(
      canReviewSubmission(
        { ...value, attachments: [{ ...file, fileStatus: 'Rejected' }] },
        'saved text',
        false,
      ),
    ).toBe(false);
    expect(
      canReviewSubmission({ ...value, attachments: [{ ...file, fileStatus: 'Ready' }] }, '', false),
    ).toBe(true);
  });
  it('does not show a receipt for a draft or missing server submit timestamp', () => {
    expect(receiptFromAttempt(value)).toBeUndefined();
    expect(receiptFromAttempt({ ...value, status: 'Submitted' })).toBeUndefined();
  });
  it('accepts only a server receipt belonging to the exact assignment and attempt', () => {
    const submitted = {
      ...value,
      status: 'Submitted' as const,
      submittedAtUtc: '2026-10-29T10:05:00Z',
    };
    const r = receiptFromAttempt(submitted)!;
    expect(validSubmissionReceipt(r, 'assignment', 'attempt')).toBe(true);
    expect(validSubmissionReceipt(r, 'other', 'attempt')).toBe(false);
    expect(
      validSubmissionReceipt({ ...r, submittedAtUtc: 'not a date' }, 'assignment', 'attempt'),
    ).toBe(false);
  });
  it('rejects an earlier organization or an unrelated assignment even if response is 200', () => {
    expect(matchesSubmission(value, 'assignment', 'org')).toBe(true);
    expect(matchesSubmission(value, 'assignment', 'other-org')).toBe(false);
    expect(matchesSubmission({ ...value, contentVisible: false }, 'assignment', 'org')).toBe(false);
  });
});
