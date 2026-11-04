import * as uiText from '@/content/fa';
export function validScore(value: string, maximum: number) {
  return (
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= maximum
  );
}
export const evaluationLabels = {
  AwaitingEvaluation: uiText.text_fe4c80e49640,
  AwaitingGrading: uiText.text_866744ee20e1,
  Draft: uiText.text_7221d867e773,
  CorrectionDraft: uiText.text_09e66baa1023,
  ReadyForRelease: uiText.text_c5cb7fbbb9a5,
  Released: uiText.text_e4f1cf0d1e04,
  Superseded: uiText.text_6069a7cef83c,
  AwaitingRelease: uiText.text_74061dd83395,
} as const;
export function evaluationLabel(value: keyof typeof evaluationLabels) {
  return evaluationLabels[value];
}
