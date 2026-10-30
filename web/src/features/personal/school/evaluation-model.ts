/** A blank score is not a zero. Bounds come from the authoritative attempt. */
export function validScore(value: string, maximum: number) {
  return (
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= maximum
  );
}
export const evaluationLabels = {
  AwaitingEvaluation: 'در انتظار ارزیابی',
  AwaitingGrading: 'در انتظار تصحیح',
  Draft: 'پیش‌نویس ارزیابی',
  CorrectionDraft: 'پیش‌نویس اصلاح',
  ReadyForRelease: 'آمادهٔ انتشار',
  Released: 'منتشرشده',
  Superseded: 'نسخهٔ جایگزین‌شده',
  AwaitingRelease: 'در انتظار انتشار',
} as const;
export function evaluationLabel(value: keyof typeof evaluationLabels) {
  return evaluationLabels[value];
}
