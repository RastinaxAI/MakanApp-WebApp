import { describe, it, expect } from 'vitest';
import {
  activeNavigation,
  isFocusedPage,
  isSchoolRole,
  isSchoolPath,
  navigation,
  routes,
  schoolRoutes,
  workspaceDestination,
  defaultBackTarget,
} from '@/config/navigation';
describe('client navigation contract', () => {
  it('provides valid in-app back destinations for direct entry instead of relying on external browser history', () => {
    const id = '00000000-0000-4000-8000-000000000002';
    expect(defaultBackTarget('/personal/education/classes')).toBe('/personal/education');
    expect(defaultBackTarget(`/personal/education/classes/${id}`)).toBe(
      '/personal/education/classes',
    );
    expect(defaultBackTarget(`/personal/education/exams/${id}/questions/new`)).toBe(
      `/personal/education/exams/${id}/edit`,
    );
    expect(defaultBackTarget(`/personal/education/exam-submissions/${id}/questions/${id}`)).toBe(
      `/personal/education/exam-submissions/${id}/grading`,
    );
    expect(defaultBackTarget('/personal/settings/privacy')).toBe('/personal/settings');
    expect(defaultBackTarget('/personal/profile/edit')).toBe('/personal/profile');
    expect(defaultBackTarget('/personal/messages/' + id + '/info')).toBe(
      '/personal/messages/' + id,
    );
  });
  it('recognizes independent school workflows while rejecting malformed or extra paths', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    for (const path of [
      ['classes', 'new'],
      ['people', 'new'],
      ['courses', 'new'],
      ['periods', 'new'],
      ['guardians', 'new'],
      ['classes', id, 'members'],
      ['classes', id, 'sessions', 'new'],
      ['classes', id, 'exams', 'new'],
      ['exams', id, 'questions', 'new'],
      ['exams', id, 'review'],
      ['sessions', id, 'edit'],
      ['people', id, 'edit'],
    ])
      expect(isSchoolPath(path)).toBe(true);
    for (const path of [
      ['sessions', 'new'],
      ['people', 'bad', 'edit'],
      ['classes', id, 'members', 'extra'],
      ['exams', id, 'questions', 'delete'],
      ['courses', id, 'edit'],
    ])
      expect(isSchoolPath(path)).toBe(false);
  });
  it('rejects unknown catch-all paths instead of opening a different page', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(isSchoolPath(['assignments', id, 'review'])).toBe(true);
    expect(isSchoolPath(['classes', id, 'lessons', 'new'])).toBe(true);
    expect(isSchoolPath(['classes', id, 'unexpected'])).toBe(false);
    expect(isSchoolPath(['lessons', id, 'review', 'extra'])).toBe(false);
    expect(isSchoolPath(['assignments', 'not-an-id', 'answer'])).toBe(false);
    expect(isSchoolPath(['made-up'])).toBe(false);
    expect(isSchoolPath(['invitations'])).toBe(true);
    expect(isSchoolPath(['invitations', id])).toBe(false);
  });
  it('keeps four user destinations and maps nested settings/contacts correctly', () => {
    expect(navigation.map((n) => n.href)).toEqual([
      routes.education,
      routes.assistant,
      routes.messages,
      routes.profile,
    ]);
    expect(activeNavigation('/personal/settings/blocked')).toBe(routes.profile);
    expect(activeNavigation(routes.contacts)).toBe(routes.messages);
    expect(activeNavigation('/personal/education/classes/abc')).toBe(routes.education);
    expect(activeNavigation('/admin')).toBeUndefined();
  });
  it('keeps explicit organization inboxes while default messages stays personal', () => {
    expect(workspaceDestination('/personal/messages', 'Organization')).toBe(
      '/personal/messages?view=organization',
    );
    expect(workspaceDestination('/personal/messages', 'Personal')).toBe(routes.messages);
    expect(workspaceDestination('/personal/education', 'Personal')).toBe(routes.personal);
  });
  it('does not treat the create-conversation route as an actual chat room', () => {
    expect(isFocusedPage('/personal/messages/new')).toBe(true);
    expect(isFocusedPage('/personal/messages')).toBe(false);
    expect(isFocusedPage(schoolRoutes.review('abc'))).toBe(true);
  });
  it('accepts only official educational roles; a personal account is not a fabricated role', () => {
    for (const role of ['Student', 'Teacher', 'Parent', 'Manager'])
      expect(isSchoolRole(role)).toBe(true);
    for (const role of ['Owner', 'PlatformOwner', 'Personal', null, 'Individual'])
      expect(isSchoolRole(role)).toBe(false);
  });
});
