import * as uiText from '@/content/fa';
export const submissionFileAccept = 'image/jpeg,image/png,image/webp,application/pdf';
export const submissionMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
export function submissionFileError(file: { name: string; type: string; size: number }) {
  if (!file.size) return uiText.text_cc3962f50c27;
  if (
    file.type
      ? !submissionMimeTypes.has(file.type.toLowerCase())
      : !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)
  )
    return uiText.text_b7009556ce7f;
  return '';
}
