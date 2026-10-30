export const submissionFileAccept = 'image/jpeg,image/png,image/webp,application/pdf';
export const submissionMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
export function submissionFileError(file: { name: string; type: string; size: number }) {
  if (!file.size) return 'فایل خالی است.';
  if (
    file.type
      ? !submissionMimeTypes.has(file.type.toLowerCase())
      : !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)
  )
    return 'عکس JPG، PNG، WebP یا فایل PDF انتخاب کنید.';
  return '';
}
