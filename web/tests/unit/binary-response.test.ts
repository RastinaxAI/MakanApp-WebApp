import { describe, it, expect } from 'vitest';
import { assertBinaryContent } from '@/lib/api/binary-response';
describe('binary envelope boundary', () => {
  it('rejects ProblemDetails with either normal or mixed-case media type', () => {
    for (const type of ['application/problem+json', 'Application/Problem+JSON; charset=utf-8'])
      expect(() => assertBinaryContent(new Headers({ 'Content-Type': type }))).toThrowError(
        expect.objectContaining({ status: 502 }),
      );
  });
  it('accepts actual JSON files and arbitrary file MIME types', () => {
    for (const type of ['application/json', 'image/png', 'application/octet-stream'])
      expect(() => assertBinaryContent(new Headers({ 'Content-Type': type }))).not.toThrow();
  });
});
