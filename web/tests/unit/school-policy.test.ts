import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { isMissingActiveAttempt, safeMeetingUrl } from '@/features/personal/school/policy';
import { requiresSchoolContext, contextSignature } from '@/lib/client-surface';
describe('school context and student attempt safety', () => {
  it('only treats the documented missing-active-attempt response as an absent attempt', () => {
    expect(isMissingActiveAttempt(new ApiError(404, { code: 'EXAM_ATTEMPT_NOT_FOUND' }))).toBe(
      true,
    );
    for (const error of [
      new ApiError(404, { code: 'EXAM_NOT_FOUND' }),
      new ApiError(403),
      new ApiError(503),
      new Error('offline'),
    ])
      expect(isMissingActiveAttempt(error)).toBe(false);
  });
  it('opens only http/https meeting destinations, never an executable or local URL', () => {
    expect(safeMeetingUrl('https://example.com/class')).toBe('https://example.com/class');
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      'file:///C:/test',
      null,
      'invalid',
    ])
      expect(safeMeetingUrl(url)).toBeNull();
  });
  it('requires organization context for academic, directory and report operations without coupling personal messaging', () => {
    for (const path of [
      '/api/v1/academic/classes',
      '/api/v1/organization/people',
      '/api/v1/reports/parent/assignments',
    ])
      expect(requiresSchoolContext(path)).toBe(true);
    expect(requiresSchoolContext('/api/v1/conversations')).toBe(false);
    const state = {
      workspaceType: 'Organization',
      organizationId: 'school-a',
      membershipId: 'membership-a',
      activeRole: 'Teacher',
      subjectOrganizationPersonId: null,
    };
    expect(
      contextSignature({ ...state, activeRole: 'Parent', subjectOrganizationPersonId: 'child-a' }),
    ).not.toBe(contextSignature(state));
    expect(contextSignature({ ...state, organizationId: 'school-b' })).not.toBe(
      contextSignature(state),
    );
  });
});
