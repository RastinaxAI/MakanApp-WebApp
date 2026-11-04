import type { components } from '@/generated/api/schema';
export function matchesAcademicResource(
  value: {
    organizationId?: string | null;
    classRef?: components['schemas']['AcademicClassRefDto'];
  },
  organizationId: string | null,
  personalClassId?: string,
) {
  if (personalClassId)
    return (
      value.organizationId == null &&
      value.classRef?.kind === 'PersonalClass' &&
      value.classRef.classId === personalClassId
    );
  return value.organizationId === organizationId && value.classRef?.kind !== 'PersonalClass';
}
