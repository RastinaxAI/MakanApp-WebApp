import { describe, it, expect } from 'vitest';
import { isExtracurricularPath } from '@/features/extracurricular/routes';
const id = '00000000-0000-4000-8000-000000000002';
describe('independent class deep route boundaries', () => {
  it('accepts the request wizard and member/invitation details', () => {
    for (const parts of [
      ['requests'],
      ['requests', 'new'],
      ['requests', id, 'edit'],
      ['classes', id],
      ['classes', id, 'members', id],
      ['classes', id, 'assignments', 'new'],
      ['classes', id, 'assignments', id, 'answer'],
      ['classes', id, 'assignments', id, 'submissions', id, 'evaluate'],
      ['classes', id, 'exams', id, 'questions'],
      ['classes', id, 'exams', id, 'attempts', id, 'receipt'],
      ['classes', id, 'exams', id, 'result', 'correction'],
      ['invitations'],
      ['invitations', id],
      ['join', id],
    ])
      expect(isExtracurricularPath(parts)).toBe(true);
  });
  it.each([
    ['classes', 'not-a-class'],
    ['requests', 'new', 'edit'],
    ['classes', id, 'unknown'],
    ['classes', id, 'assignments', id, 'attempts', id],
    ['classes', id, 'assignments', id, 'attempts', id, 'receipt'],
    ['classes', id, 'setup', 'extra'],
    ['invitations', id, 'accept'],
    ['join'],
    ['owner', 'requests'],
  ])('rejects unsupported route %s', (...parts) => {
    expect(isExtracurricularPath(parts)).toBe(false);
  });
});
