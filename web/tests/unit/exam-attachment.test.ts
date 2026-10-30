import { describe, expect, it } from 'vitest';
import { examAnswerPresent, examAttachmentsValid, examFileIssue } from '@/lib/exam-attachment';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
const policy: S['ExamQuestionAttachmentPolicyDto'] = {
  attachmentsAllowed: true,
  textRequired: false,
  allowedContentTypes: ['application/pdf'],
  maximumCount: 1,
  maximumTotalBytes: 100,
};
const question = {
  questionType: 'Descriptive',
  attachmentPolicy: policy,
} as S['StudentExamAttemptQuestionDto'];
const file = {
  fileAssetId: 'id',
  fileStatus: 'Ready',
  canDownload: true,
  contentType: 'application/pdf',
  sizeBytes: 50,
} as S['AcademicAnswerAttachmentDto'];
const answer = { textAnswer: null, attachments: [file] } as S['StudentCurrentExamAnswerDto'];
describe('server-declared exam attachment policy', () => {
  it('counts a ready file-only response only when permitted', () => {
    expect(examAnswerPresent(question, answer)).toBe(true);
    expect(
      examAnswerPresent(
        { ...question, attachmentPolicy: { ...policy, textRequired: true } },
        answer,
      ),
    ).toBe(false);
    expect(
      examAnswerPresent(question, { ...answer, attachments: [{ ...file, fileStatus: 'Pending' }] }),
    ).toBe(false);
  });
  it('blocks finalization for stale, disallowed or incomplete attachment answers', () => {
    expect(examAttachmentsValid(question, answer)).toBe(true);
    expect(examAttachmentsValid({ ...question, attachmentPolicy: null }, answer)).toBe(false);
    expect(
      examAttachmentsValid(
        { ...question, attachmentPolicy: { ...policy, textRequired: true } },
        answer,
      ),
    ).toBe(false);
    expect(examAttachmentsValid(question, { ...answer, attachments: [file, file] })).toBe(false);
    expect(
      examAttachmentsValid(question, { ...answer, attachments: [{ ...file, sizeBytes: 101 }] }),
    ).toBe(false);
  });
  it('validates MIME, empty files and cumulative limits before upload without inventing null limits', () => {
    expect(examFileIssue(policy, { type: 'application/pdf', size: 50 }, [])).toBeNull();
    for (const candidate of [
      { type: 'image/png', size: 1 },
      { type: 'application/pdf', size: 0 },
      { type: 'application/pdf', size: 101 },
    ])
      expect(examFileIssue(policy, candidate, [])).toBeTruthy();
    expect(examFileIssue(policy, { type: 'application/pdf', size: 1 }, [file])).toBeTruthy();
    expect(
      examFileIssue(
        { ...policy, maximumCount: null, maximumTotalBytes: null },
        { type: 'application/pdf', size: 1000 },
        [file],
      ),
    ).toBeNull();
  });
});
