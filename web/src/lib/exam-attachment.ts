import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function examAttachmentsValid(
  q: S['StudentExamAttemptQuestionDto'],
  a?: S['StudentCurrentExamAnswerDto'],
) {
  const files = a?.attachments ?? [],
    p = q.attachmentPolicy;
  if (!files.length) return true;
  return (
    !!p?.attachmentsAllowed &&
    (!p.textRequired || !!a?.textAnswer?.trim()) &&
    (p.maximumCount === null || files.length <= p.maximumCount) &&
    (p.maximumTotalBytes === null ||
      files.reduce((n, f) => n + f.sizeBytes, 0) <= p.maximumTotalBytes) &&
    files.every((f) => f.fileStatus === 'Ready' && p.allowedContentTypes.includes(f.contentType))
  );
}
export function examAnswerPresent(
  q: S['StudentExamAttemptQuestionDto'],
  a?: S['StudentCurrentExamAnswerDto'],
) {
  if (!a) return false;
  if (q.questionType !== 'Descriptive') return !!a.selectedOptionId;
  if (a.textAnswer?.trim()) return true;
  return (
    !!q.attachmentPolicy?.attachmentsAllowed &&
    !q.attachmentPolicy.textRequired &&
    !!a.attachments?.some((f) => f.fileStatus === 'Ready' && f.canDownload)
  );
}
export function examFileIssue(
  policy: S['ExamQuestionAttachmentPolicyDto'],
  file: { type: string; size: number },
  existing: S['AcademicAnswerAttachmentDto'][],
) {
  if (!policy?.attachmentsAllowed) return uiText.text_58959f75f51a;
  if (!file.size) return uiText.text_cc3962f50c27;
  if (!policy.allowedContentTypes.includes(file.type)) return uiText.text_cc55eba1583f;
  if (policy.maximumCount !== null && existing.length >= policy.maximumCount)
    return uiText.text_3526235fe98e;
  if (
    policy.maximumTotalBytes !== null &&
    existing.reduce((n, f) => n + f.sizeBytes, 0) + file.size > policy.maximumTotalBytes
  )
    return uiText.text_1212e6c5e2b8;
  return null;
}
