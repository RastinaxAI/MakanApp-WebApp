import type { components } from '@/generated/api/schema';
export type FileAsset = components['schemas']['FileAssetResult'];
export type Attachment = components['schemas']['MessageAttachmentResult'];
export function attachmentKind(contentType: string): 'Image' | 'Video' | 'File' {
  return contentType.startsWith('image/')
    ? 'Image'
    : contentType.startsWith('video/')
      ? 'Video'
      : 'File';
}
export function attachmentMessageKind(files: Pick<FileAsset, 'contentType'>[]) {
  return files.length && files.every((file) => attachmentKind(file.contentType) === 'Image')
    ? 'Image'
    : files.length && files.every((file) => attachmentKind(file.contentType) === 'Video')
      ? 'Video'
      : 'File';
}
export function attachmentMetadata(file: FileAsset): Attachment {
  return {
    fileAssetId: file.id,
    fileName: file.originalFileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    createdAtUtc: file.createdAtUtc,
    kind: attachmentKind(file.contentType),
  };
}
export function safeImagePreview(contentType: string) {
  return /^(image\/(jpeg|png|webp|gif|avif))$/i.test(contentType);
}
export function fileTransferPath(conversationId: string, fileId?: string, content = false) {
  return (
    '/api/client/files' +
    (fileId ? '/' + fileId + (content ? '/content' : '') : '') +
    '?' +
    new URLSearchParams({ conversationId })
  );
}
export function formatFileSize(bytes: number) {
  const n = (value: number) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value);
  return bytes >= 1024 * 1024
    ? n(bytes / 1024 / 1024) + ' مگابایت'
    : bytes >= 1024
      ? n(bytes / 1024) + ' کیلوبایت'
      : n(bytes) + ' بایت';
}
