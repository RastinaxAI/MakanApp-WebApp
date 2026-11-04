import { describe, expect, it } from 'vitest';
import {
  academicCapabilities,
  requestInput,
  validRequest,
  stateLabel,
  type S,
} from '@/features/extracurricular/api-model';
import { emptyClassDraft } from '@/features/extracurricular/model';
import { freezeIntent } from '@/lib/api/mutation-intent';
import { matchesAcademicResource } from '@/lib/academic-resource';
import { academicFileScope, independentUploadForm } from '@/lib/server/academic-file-scope';
import { requiresSchoolContext } from '@/lib/client-surface';
import { operationFor, validator } from '@/lib/api/contract';
const id = '00000000-0000-4000-8000-000000001800';
describe('release 80c independent domain', () => {
  it('maps a personal request without fabricated organization/enrollment or age data', () => {
    const body = requestInput({
      ...emptyClassDraft(id),
      title: '  کلاس مستقل ',
      subject: 'یادگیری',
      capacity: '۲۰',
    });
    expect(body).toEqual({
      title: 'کلاس مستقل',
      purpose: 'یادگیری',
      description: null,
      suggestedCapacity: 20,
      suggestedManagerUserId: id,
      suggestedTeacherUserId: null,
    });
    expect(validRequest(body)).toBe(true);
  });
  it.each([0, -1, 1.2, NaN])('rejects invalid requested capacity %s', (capacity) => {
    expect(
      validRequest({
        title: 'عنوان',
        purpose: 'هدف',
        description: null,
        suggestedCapacity: capacity,
        suggestedManagerUserId: null,
        suggestedTeacherUserId: null,
      }),
    ).toBe(false);
  });
  it('does not turn host or legacy teacher flags into current academic permissions', () => {
    const value = {
      state: 'Active',
      archived: false,
      isHost: true,
      canCreateEducationalContent: true,
    } as S['PersonalClassDto'];
    expect(academicCapabilities(value)).toEqual({
      assignments: false,
      exams: false,
      grade: false,
      ownResults: false,
    });
    value.capabilities = {
      canAuthorAssignments: true,
      canAuthorExams: false,
      canGrade: true,
    } as S['PersonalClassCapabilities'];
    expect(academicCapabilities(value)).toMatchObject({
      assignments: true,
      exams: false,
      grade: true,
    });
    value.state = 'Suspended';
    expect(academicCapabilities(value).assignments).toBe(false);
    value.state = 'Active';
    value.archived = true;
    expect(academicCapabilities(value).grade).toBe(false);
  });
  it('requires both domain and class identity rather than matching two null organization IDs', () => {
    expect(
      matchesAcademicResource(
        { organizationId: null, classRef: { kind: 'PersonalClass', classId: id } },
        null,
        id,
      ),
    ).toBe(true);
    expect(matchesAcademicResource({ organizationId: null }, null, id)).toBe(false);
    expect(
      matchesAcademicResource(
        { organizationId: null, classRef: { kind: 'OrganizationClass', classId: id } },
        null,
        id,
      ),
    ).toBe(false);
    expect(
      matchesAcademicResource(
        { organizationId: null, classRef: { kind: 'PersonalClass', classId: id } },
        null,
        id.replace('1800', '1801'),
      ),
    ).toBe(false);
  });
  it('allows independent assessment resources and retains the school boundary for organization-only APIs', () => {
    expect(requiresSchoolContext('/api/v1/academic/personal-classes/' + id + '/assignments')).toBe(
      false,
    );
    expect(requiresSchoolContext('/api/v1/academic/submission-attempts/' + id)).toBe(false);
    expect(requiresSchoolContext('/api/v1/academic/classes')).toBe(true);
    expect(requiresSchoolContext('/api/v1/organization/people')).toBe(true);
    expect(requiresSchoolContext('/api/v1/reports/manager/attendance')).toBe(true);
  });
  it('resolves the paginated collection ahead of the class ID route', () => {
    expect(operationFor('GET', '/api/v1/personal-classes/page')?.path).toBe(
      '/api/v1/personal-classes/page',
    );
    expect(operationFor('GET', '/api/v1/personal-classes/invitations/page')?.path).toBe(
      '/api/v1/personal-classes/invitations/page',
    );
  });
  it('keeps versioned request and grant commands mandatory', () => {
    const op = operationFor('PUT', '/api/v1/personal-class-requests/' + id)!;
    expect(validator(op.body!).safeParse({ details: {} }).success).toBe(false);
    const grant = operationFor('PUT', `/api/v1/personal-classes/${id}/academic-permissions/${id}`)!;
    expect(validator(grant.body!).safeParse({ capabilities: 'Grade' }).success).toBe(false);
  });
  it('enforces published pagination limits and normalized text constraints', () => {
    const page = operationFor('GET', '/api/v1/personal-classes/page')!;
    const size = page.parameters.find((p) => p.name === 'pageSize')!;
    expect(validator(size.schema).safeParse(101).success).toBe(false);
    expect(validator(size.schema).safeParse(0).success).toBe(false);
    expect(validator(size.schema).safeParse(100).success).toBe(true);
    const request = validator({ $ref: '#/components/schemas/PersonalClassRequestInput' });
    expect(
      request.safeParse({
        title: '   ',
        purpose: 'هدف',
        description: null,
        suggestedCapacity: 1,
        suggestedManagerUserId: null,
        suggestedTeacherUserId: null,
      }).success,
    ).toBe(false);
  });
  it('retains decimal scores while rejecting precision outside the real contract', () => {
    const number = validator({
      type: 'number',
      minimum: 0.01,
      maximum: 9999999.99,
      multipleOf: 0.01,
    });
    expect(number.safeParse(0.29).success).toBe(true);
    expect(number.safeParse(0.291).success).toBe(false);
    expect(number.safeParse(0).success).toBe(false);
  });
  it('handles an unknown future status without presenting it as approved', () => {
    expect(stateLabel('FutureAccepted')).not.toBe(stateLabel('Approved'));
  });
});
describe('stable mutation intents', () => {
  it('preserves a command after serialization, and changes its ID only for a different intent', () => {
    const intent = freezeIntent(undefined, '/requests', { details: { title: 'الف' } }, 'POST');
    const replay = freezeIntent(
      JSON.parse(JSON.stringify(intent)),
      '/requests',
      { details: { title: 'الف' } },
      'POST',
    );
    expect(replay).toEqual(intent);
    expect(
      freezeIntent(intent, '/requests', { details: { title: 'ب' } }, 'POST').body.clientOperationId,
    ).not.toBe(intent.body.clientOperationId);
    expect(
      freezeIntent(intent, '/other', { details: { title: 'الف' } }, 'POST').body.clientOperationId,
    ).not.toBe(intent.body.clientOperationId);
  });
});
describe('independent academic file binding', () => {
  it('uses an authenticated class reference without a fabricated organization', () => {
    expect(academicFileScope({ kind: 'PersonalClass', classId: id }, 'some-organization')).toEqual({
      organizationId: null,
      personalClassId: id,
    });
    expect(() => academicFileScope(undefined, null)).toThrow();
  });
  it('rebuilds multipart using the authorized class and strips extra selectors', async () => {
    const body = new FormData();
    body.set('File', new File(['%PDF'], 'answer.pdf', { type: 'application/pdf' }));
    body.set('PersonalClassId', id);
    body.set('OrganizationId', 'forged');
    const result = await independentUploadForm(
      new Request('http://localhost/upload', { method: 'POST', body }),
      id,
    );
    expect([...result.keys()]).toEqual(['File', 'PersonalClassId']);
    expect(result.get('PersonalClassId')).toBe(id);
  });
  it('rejects a mismatched class even if the file is valid', async () => {
    const body = new FormData();
    body.set('File', new File(['x'], 'x.pdf'));
    body.set('PersonalClassId', 'forged');
    await expect(
      independentUploadForm(new Request('http://localhost/upload', { method: 'POST', body }), id),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects an oversized multipart envelope before reading it', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'Content-Length': '99999999' },
      body: 'x',
    });
    await expect(independentUploadForm(request, id)).rejects.toMatchObject({ status: 413 });
  });
});
