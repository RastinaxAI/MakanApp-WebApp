import { describe, expect, it, beforeEach } from 'vitest';
import {
  can,
  canReadConversation,
  canReadSubmission,
  capabilitiesFor,
  guardianScope,
  myClassIds,
  permittedSchools,
  session,
  setWorkspace,
  switchPersona,
} from '../src/data/session';

function as(role: 'student' | 'teacher' | 'guardian' | 'manager' | 'admin') {
  switchPersona(role);
}

describe('role capability matrix', () => {
  it('never grants private chat reading to any role, including admin', () => {
    for (const role of ['student', 'teacher', 'guardian', 'manager', 'admin'] as const) {
      expect(capabilitiesFor(role).readPrivateChat).toBe(false);
    }
  });

  it('lets only teachers publish grades', () => {
    expect(capabilitiesFor('teacher').publishGrade).toBe(true);
    for (const role of ['student', 'guardian', 'manager', 'admin'] as const) {
      expect(capabilitiesFor(role).publishGrade).toBe(false);
    }
  });

  it('never lets a guardian submit on behalf of a learner', () => {
    expect(capabilitiesFor('guardian').submitAssignment).toBe(false);
    expect(capabilitiesFor('student').submitAssignment).toBe(true);
  });

  it('keeps platform administration separate from academy management', () => {
    expect(capabilitiesFor('admin').adminPlatform).toBe(true);
    expect(capabilitiesFor('manager').adminPlatform).toBe(false);
    expect(capabilitiesFor('manager').manageRoster).toBe(true);
    expect(capabilitiesFor('admin').publishGrade).toBe(false);
  });

  it('follows the current session role', () => {
    as('teacher');
    expect(can('takeAttendance')).toBe(true);
    as('student');
    expect(can('takeAttendance')).toBe(false);
  });
});

describe('workspace scope', () => {
  it('only lists schools the persona legitimately belongs to', () => {
    as('manager');
    const managerSchools = permittedSchools().map((s) => s.id).sort();
    expect(managerSchools).toEqual(['s-mehr', 's-neda']);
    as('student');
    expect(permittedSchools().map((s) => s.id)).toEqual(['s-neda']);
  });

  it('ignores a workspace switch the account is not entitled to', () => {
    as('student');
    session.set({ schoolId: 's-neda' });
    setWorkspace('s-mehr');
    expect(session.get().schoolId).toBe('s-neda');
  });

  it('allows a manager to move between two of their own academies', () => {
    as('manager');
    setWorkspace('s-mehr');
    expect(session.get().schoolId).toBe('s-mehr');
  });
});

describe('class scope', () => {
  it('scopes a student to enrolled classes only, including completed history', () => {
    as('student');
    expect(myClassIds().sort()).toEqual(['c-math', 'c-math-old', 'c-physics']);
    expect(myClassIds()).not.toContain('c-lit');
  });

  it('scopes a teacher to assigned classes only', () => {
    as('teacher');
    expect(myClassIds().sort()).toEqual(['c-math', 'c-math-old', 'c-physics']);
    expect(myClassIds()).not.toContain('c-lit');
  });

  it('scopes a guardian to the selected child classes', () => {
    as('guardian');
    const classes = myClassIds();
    expect(classes).toContain('c-math');
    expect(classes).toContain('c-lit');
    expect(classes).not.toContain('c-physics');
  });
});

describe('conversation access', () => {
  it('opens a direct conversation for its members', () => {
    as('student');
    expect(canReadConversation('d-teacher')).toBe(true);
  });

  it('refuses a conversation the account is not a member of', () => {
    as('student');
    expect(canReadConversation('d-admin')).toBe(false);
  });

  it('does not let admin read a private conversation', () => {
    as('admin');
    expect(canReadConversation('d-teacher')).toBe(false);
    expect(canReadConversation('g-class-math')).toBe(false);
  });
});

describe('submission access', () => {
  it('lets the owner read their own work', () => {
    as('student');
    expect(canReadSubmission('sub-sara-graph')).toBe(true);
  });

  it('refuses another learner’s private work to a student', () => {
    as('student');
    expect(canReadSubmission('sub-arian-quad')).toBe(false);
  });

  it('lets the class teacher read the submissions they grade', () => {
    as('teacher');
    expect(canReadSubmission('sub-arian-quad')).toBe(true);
  });

  it('lets a verified guardian read their child’s published result', () => {
    as('guardian');
    expect(guardianScope('p-arian')?.status).toBe('verified');
    expect(canReadSubmission('sub-arian-quad')).toBe(true);
  });

  it('blocks a guardian for a student they are not related to', () => {
    as('guardian');
    expect(canReadSubmission('sub-taraneh-quad')).toBe(false);
  });
});

describe('demo switcher honesty', () => {
  beforeEach(() => as('student'));
  it('resets the workspace when the persona changes', () => {
    session.set({ schoolId: 's-mehr' });
    switchPersona('manager');
    expect(session.get().schoolId).toBe('s-neda');
    expect(session.get().childId).toBeNull();
  });

  it('sets a guardian child so the report scope is never global', () => {
    switchPersona('guardian');
    expect(session.get().childId).toBe('p-arian');
  });
});
