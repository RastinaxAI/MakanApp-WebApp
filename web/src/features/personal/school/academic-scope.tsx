'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { usePersonal } from '../provider';
import { matchesAcademicResource } from '@/lib/academic-resource';
import { schoolRoutes } from '@/config/navigation';
type AcademicRef = { kind: 'OrganizationClass' | 'PersonalClass'; classId: string } | null;
type Scope = {
  classId: string;
  assignments: boolean;
  exams: boolean;
  grade: boolean;
  ownResults: boolean;
};
const Context = createContext<Scope | null>(null);
export function AcademicScope({ value, children }: { value: Scope; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAcademicScope() {
  const personal = useContext(Context),
    { session } = usePersonal();
  const base = personal
    ? '/personal/extracurricular/classes/' + personal.classId
    : '/personal/education';
  const routes = personal
    ? {
        ...schoolRoutes,
        class: () => base,
        assignment: (id: string) => `${base}/assignments/${id}`,
        answer: (id: string) => `${base}/assignments/${id}/answer`,
        review: (id: string) => `${base}/assignments/${id}/review`,
        receipt: (id: string) => `${base}/assignments/${id}/receipt`,
      }
    : schoolRoutes;
  return {
    personal,
    base,
    routes,
    classPath: (id: string) => (personal ? base : `${base}/classes/${id}`),
    classApi: (id: string) =>
      '/api/v1/academic/' + (personal ? 'personal-classes/' : 'classes/') + id,
    matches: (value: { organizationId?: string | null; classRef?: AcademicRef }) =>
      matchesAcademicResource(value, session.context.organizationId, personal?.classId),
    learner: personal ? personal.ownResults : session.context.activeRole === 'Student',
    parent: !personal && session.context.activeRole === 'Parent',
    hasChild: !!session.context.subjectOrganizationPersonId,
  };
}
