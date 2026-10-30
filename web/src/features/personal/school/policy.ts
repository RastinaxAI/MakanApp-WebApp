import { ApiError } from '@/lib/api/errors';
export function isMissingActiveAttempt(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 404 &&
    error.problem.code === 'EXAM_ATTEMPT_NOT_FOUND'
  );
}
export function safeMeetingUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
