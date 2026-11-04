import type { components } from '@/generated/api/schema';
import { integration80c as t } from '@/content/fa';
import { normalizeClassNumber, type ClassDraft } from './model';
export type S = components['schemas'];
export const classApi = '/api/v1/personal-classes';
export const requestApi = '/api/v1/personal-class-requests';
export const classBase = '/personal/extracurricular';
export function requestInput(draft: ClassDraft): S['PersonalClassRequestInput'] {
  return {
    title: draft.title.trim(),
    purpose: draft.subject.trim(),
    description: draft.description.trim() || null,
    suggestedCapacity: Number(normalizeClassNumber(draft.capacity)),
    suggestedManagerUserId: draft.managerUserId || null,
    suggestedTeacherUserId: draft.teacherUserId || null,
  };
}
export function validRequest(input: S['PersonalClassRequestInput']) {
  return (
    input.title.length > 0 &&
    input.title.length <= 200 &&
    input.purpose.length > 0 &&
    input.purpose.length <= 2000 &&
    (input.description?.length ?? 0) <= 4000 &&
    Number.isSafeInteger(input.suggestedCapacity) &&
    input.suggestedCapacity > 0
  );
}
export function stateLabel(value: string) {
  return t.states[value] ?? t.states.Unknown;
}
export function hasFlag(value: string | undefined, flag: string) {
  return (
    value
      ?.split(',')
      .map((x) => x.trim())
      .includes(flag) ?? false
  );
}
export function academicCapabilities(value: S['PersonalClassDto']) {
  // Legacy isHost/canCreateEducationalContent and local roles are not academic grants.
  return {
    assignments:
      !value.archived &&
      value.state === 'Active' &&
      value.capabilities?.canAuthorAssignments === true,
    exams:
      !value.archived && value.state === 'Active' && value.capabilities?.canAuthorExams === true,
    grade: !value.archived && value.state === 'Active' && value.capabilities?.canGrade === true,
    ownResults: value.capabilities?.canViewOwnResults === true,
  };
}
