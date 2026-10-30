import { ApiError } from './errors';
/** Error envelopes must never become user downloads, even with an erroneous 2xx status. */
export function assertBinaryContent(headers: Pick<Headers, 'get'>) {
  if (
    headers.get('Content-Type')?.toLowerCase().split(';')[0].trim() === 'application/problem+json'
  )
    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
}
