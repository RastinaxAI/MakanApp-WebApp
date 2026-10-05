/**
 * Session + authorisation model.
 *
 * IMPORTANT: everything here is a *client-side demo* of the access rules the
 * real server must enforce. Showing a tool is never a grant: each capability is
 * checked again per action, and `isDemoRole` keeps the switcher honestly
 * labelled instead of pretending a client-side toggle grants a role.
 */

import { createStore } from '../core/store';
import type { Role } from './types';
import {
  assignmentById,
  classes,
  conversationById,
  guardianLinks,
  personaIds,
  personById,
  schoolById,
  schools,
  submissionFor,
  submissions,
} from './seed';

export interface SessionState {
  /** Demo persona id; in production this comes from the authenticated session. */
  personaId: string;
  role: Role;
  schoolId: string | null;
  /** Guardian's selected child, teacher/manager scope, etc. */
  childId: string | null;
  theme: 'light' | 'dark' | 'system';
  locale: 'fa' | 'ar' | 'en';
  reducedMotion: boolean;
  signedIn: boolean;
  bannerDismissed: boolean;
  lastReadAt: string;
}

export const session = createStore<SessionState>(
  {
    personaId: personaIds.student,
    role: 'student',
    schoolId: 's-neda',
    childId: 'p-arian',
    theme: 'system',
    locale: 'fa',
    reducedMotion: false,
    signedIn: true,
    bannerDismissed: false,
    lastReadAt: new Date().toISOString(),
  },
  'makan.session.v2',
);

export function currentPerson() {
  return personById.get(session.get().personaId) ?? personById.get(personaIds.student)!;
}

export function currentRole(): Role {
  return session.get().role;
}

export function currentSchool() {
  const id = session.get().schoolId;
  return id ? schoolById.get(id) : undefined;
}

export const ROLE_LABEL: Record<Role, string> = {
  student: 'دانش‌آموز',
  teacher: 'معلم',
  guardian: 'والد / سرپرست',
  manager: 'مدیر آموزشگاه',
  admin: 'ادمین ماکان',
};

/** Roles available to the demo switcher, mapped to their persona. */
export const DEMO_PERSONAS: { role: Role; personaId: string }[] = [
  { role: 'student', personaId: personaIds.student },
  { role: 'teacher', personaId: personaIds.teacher },
  { role: 'guardian', personaId: personaIds.guardian },
  { role: 'manager', personaId: personaIds.manager },
  { role: 'admin', personaId: personaIds.admin },
];

/** Schools the current persona legitimately belongs to. Never a full list. */
export function permittedSchools(): { id: string; name: string; role: string }[] {
  const persona = session.get().personaId;
  const out: { id: string; name: string; role: string }[] = [];
  if (persona === personaIds.manager) {
    out.push({ id: 's-neda', name: 'آموزشگاه ندا', role: 'مدیر' });
    out.push({ id: 's-mehr', name: 'آموزشگاه مهر', role: 'مدرس' });
  } else if (persona === personaIds.teacher) {
    out.push({ id: 's-neda', name: 'آموزشگاه ندا', role: 'معلم' });
  } else if (persona === personaIds.student) {
    out.push({ id: 's-neda', name: 'آموزشگاه ندا', role: 'دانش‌آموز' });
  } else if (persona === personaIds.guardian) {
    out.push({ id: 's-neda', name: 'آموزشگاه ندا', role: 'والد' });
  }
  return out;
}

/** Contexts shown in the header switcher: personal space + permitted schools. */
export function workspaces(): { id: string; label: string; sub: string; kind: 'personal' | 'school' }[] {
  const out: { id: string; label: string; sub: string; kind: 'personal' | 'school' }[] = [
    { id: 'personal', label: 'فضای شخصی', sub: ROLE_LABEL[currentRole()], kind: 'personal' },
  ];
  for (const s of permittedSchools()) {
    out.push({ id: s.id, label: s.name, sub: s.role, kind: 'school' as const });
  }
  return out;
}

export function switchPersona(role: Role): void {
  const entry = DEMO_PERSONAS.find((d) => d.role === role);
  if (!entry) return;
  const permitted = permittedSchoolsFor(entry.personaId, role);
  session.set({
    personaId: entry.personaId,
    role,
    schoolId: permitted[0] ?? null,
    childId: role === 'guardian' ? 'p-arian' : null,
  });
}

function permittedSchoolsFor(personaId: string, role: Role): string[] {
  if (role === 'manager' && personaId === personaIds.manager) return ['s-neda', 's-mehr'];
  if (role === 'admin') return [...schools.map((s) => s.id)];
  return ['s-neda'];
}

export function setWorkspace(id: string): void {
  if (id === 'personal') {
    session.set({ schoolId: null });
    return;
  }
  if (!permittedSchools().some((s) => s.id === id)) return; // never opens a school the account cannot see
  session.set({ schoolId: id });
}

/* ------------------------------------------------------------- capabilities */

export interface Capability {
  /** Submit an answer on behalf of self. */
  submitAssignment: boolean;
  /** See a graded result + published feedback. */
  viewScore: boolean;
  /** Read another learner's private submission. */
  viewOthersWork: boolean;
  /** See a child's attendance/report (guardian scope). */
  viewChildReport: boolean;
  /** Act as the learner in a graded item (never, to avoid self-grading). */
  gradeSelf: boolean;
  /** Publish grades. */
  publishGrade: boolean;
  /** Manage class roster/enrolment. */
  manageRoster: boolean;
  /** Create sessions/assignments/exams. */
  authorContent: boolean;
  /** Take attendance. */
  takeAttendance: boolean;
  /** Administer the platform (requests, payments, plan changes). */
  adminPlatform: boolean;
  /** Read private chat history (no role has this, including admin). */
  readPrivateChat: boolean;
}

const MATRIX: Record<Role, Capability> = {
  student: {
    submitAssignment: true,
    viewScore: true,
    viewOthersWork: false,
    viewChildReport: false,
    gradeSelf: false,
    publishGrade: false,
    manageRoster: false,
    authorContent: false,
    takeAttendance: false,
    adminPlatform: false,
    readPrivateChat: false,
  },
  teacher: {
    submitAssignment: false,
    viewScore: true,
    viewOthersWork: true,
    viewChildReport: false,
    gradeSelf: false,
    publishGrade: true,
    manageRoster: false,
    authorContent: true,
    takeAttendance: true,
    adminPlatform: false,
    readPrivateChat: false,
  },
  guardian: {
    submitAssignment: false,
    viewScore: true,
    viewOthersWork: false,
    viewChildReport: true,
    gradeSelf: false,
    publishGrade: false,
    manageRoster: false,
    authorContent: false,
    takeAttendance: false,
    adminPlatform: false,
    readPrivateChat: false,
  },
  manager: {
    submitAssignment: false,
    viewScore: true,
    viewOthersWork: true,
    viewChildReport: false,
    gradeSelf: false,
    publishGrade: false,
    manageRoster: true,
    authorContent: true,
    takeAttendance: true,
    adminPlatform: false,
    readPrivateChat: false,
  },
  admin: {
    submitAssignment: false,
    viewScore: false,
    viewOthersWork: false,
    viewChildReport: false,
    gradeSelf: false,
    publishGrade: false,
    manageRoster: true,
    authorContent: false,
    takeAttendance: false,
    adminPlatform: true,
    readPrivateChat: false,
  },
};

export function can(capability: keyof Capability): boolean {
  return MATRIX[currentRole()][capability];
}

export function capabilitiesFor(role: Role): Capability {
  return MATRIX[role];
}

/* -------------------------------------------------------------- scope helpers */

export function myClassIds(): string[] {
  const persona = session.get().personaId;
  return classes
    .filter((c) =>
      currentRole() === 'student'
        ? c.studentIds.includes(persona)
        : currentRole() === 'teacher'
          ? c.teacherIds.includes(persona)
          : currentRole() === 'guardian'
            ? c.studentIds.includes(session.get().childId ?? '')
            : true,
    )
    .map((c) => c.id);
}

export function myChildren(): string[] {
  const persona = session.get().personaId;
  return guardianLinks
    .filter((g) => g.guardianId === persona && g.status === 'verified')
    .map((g) => g.studentId);
}

export function guardianScope(studentId: string) {
  return guardianLinks.find((g) => g.guardianId === session.get().personaId && g.studentId === studentId);
}

/** A conversation is readable only by its members. Admins are not members. */
export function canReadConversation(conversationId: string): boolean {
  const convo = conversationById.get(conversationId);
  if (!convo) return false;
  if (can('readPrivateChat')) return true;
  return convo.memberIds.includes(session.get().personaId);
}

/** A submission is visible to its owner, the class teacher, or the manager. */
export function canReadSubmission(submissionId: string): boolean {
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return false;
  if (sub.studentId === session.get().personaId) return true;
  if (currentRole() === 'guardian') return guardianScope(sub.studentId)?.status === 'verified';
  const room = classes.find((c) => c.id === assignmentClassId(sub.assignmentId));
  if (!room) return false;
  if (currentRole() === 'teacher') return room.teacherIds.includes(session.get().personaId);
  if (currentRole() === 'manager') return session.get().schoolId === roomSchoolId(room.id);
  return false;
}

function assignmentClassId(assignmentId: string): string {
  return assignmentById.get(assignmentId)?.classId ?? '';
}

function roomSchoolId(classId: string): string | null {
  return classes.find((c) => c.id === classId)?.schoolId ?? null;
}

/** Guardian view of a submission is the published part only. */
export function submissionVisibleParts(submissionId: string): 'full' | 'published' | 'none' {
  if (canReadSubmission(submissionId)) {
    if (currentRole() === 'guardian' && session.get().personaId !== submissions.find((s) => s.id === submissionId)?.studentId) {
      return 'published';
    }
    return 'full';
  }
  return 'none';
}

export function mySubmission(assignmentId: string) {
  return submissionFor(assignmentId, session.get().personaId);
}