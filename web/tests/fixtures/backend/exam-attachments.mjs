import { make, ids } from './state.mjs';
export function examAttachmentRoute({ state, url, body, auth, req, send }) {
  const match =
    /^\/api\/v1\/academic\/exam-attempts\/([^/]+)\/answers\/([^/]+)\/attachments(?:\/([^/]+))?$/.exec(
      url.pathname,
    );
  if (!match) return false;
  const attempt = state.examAttempt,
    question = attempt?.questions.find((q) => q.attemptQuestionId === match[2]);
  if (
    auth.role !== 'Student' ||
    auth.context.workspaceType !== 'Organization' ||
    !attempt ||
    attempt.examAttemptId !== match[1] ||
    !question
  )
    return send({ code: 'NOT_FOUND' }, 404);
  const query = Object.fromEntries(url.searchParams),
    op = body.clientOperationId ?? query.ClientOperationId;
  state.examAttachmentOps ??= new Map();
  if (state.examAttachmentOps.has(op)) return send(state.examAttachmentOps.get(op));
  const index = state.examAnswers.findIndex((a) => a.examAttemptQuestionId === match[2]),
    previous = state.examAnswers[index];
  const revision =
    req.method === 'DELETE'
      ? query.ExpectedRevisionNumber
        ? Number(query.ExpectedRevisionNumber)
        : null
      : body.expectedRevisionNumber;
  const lease = req.method === 'DELETE' ? Number(query.WriteLeaseVersion) : body.writeLeaseVersion;
  if (
    attempt.status !== 'InProgress' ||
    lease !== 1 ||
    revision !== (previous?.revisionNumber ?? null)
  )
    return send({ code: 'EXAM_REVISION_CONFLICT' }, 409);
  const files = [...(previous?.attachments ?? [])],
    policy = question.attachmentPolicy;
  if (req.method === 'POST') {
    const file = state.files.get(body.fileAssetId)?.asset;
    if (!file || file.uploadedByUserId !== auth.user.id || file.status !== 'Ready')
      return send({ code: 'FILE_NOT_AVAILABLE' }, 409);
    if (
      !policy?.attachmentsAllowed ||
      !policy.allowedContentTypes.includes(file.contentType) ||
      (policy.maximumCount !== null && files.length >= policy.maximumCount) ||
      (policy.maximumTotalBytes !== null &&
        files.reduce((n, f) => n + f.sizeBytes, 0) + file.sizeBytes > policy.maximumTotalBytes)
    )
      return send({ code: 'EXAM_ATTACHMENT_POLICY_FAILED' }, 400);
    files.push(
      make('AcademicAnswerAttachmentDto', {
        fileAssetId: file.id,
        originalFileName: file.originalFileName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        fileStatus: 'Ready',
        canDownload: true,
        downloadPath: null,
      }),
    );
  } else if (req.method === 'DELETE') {
    const i = files.findIndex((f) => f.fileAssetId === match[3]);
    if (i < 0) return send({ code: 'NOT_FOUND' }, 404);
    files.splice(i, 1);
  } else return send({ code: 'METHOD_NOT_ALLOWED' }, 405);
  state.answerSetVersion++;
  const row = make('StudentCurrentExamAnswerDto', {
    ...previous,
    examAttemptQuestionId: match[2],
    attachments: files,
    textAnswer: previous?.textAnswer ?? null,
    revisionNumber: (previous?.revisionNumber ?? 0) + 1,
    answerSetVersion: state.answerSetVersion,
  });
  if (index < 0) state.examAnswers.push(row);
  else state.examAnswers[index] = row;
  const receipt = make('ExamAnswerReceiptDto', {
    examAttemptId: ids.examAttempt,
    examAttemptQuestionId: match[2],
    answerSetVersion: state.answerSetVersion,
    writeLeaseVersion: 1,
    revisionNumber: row.revisionNumber,
    status: 'Accepted',
  });
  state.examAttachmentOps.set(op, receipt);
  return send(receipt);
}
