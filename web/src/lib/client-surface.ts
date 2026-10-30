// This bounds the public-account BFF surface. It is NOT a permission grant;
// the authenticated backend must authorize each operation and resource.
import allowedOperations from '../../contracts/client-surface.json';
const clientOperations = new Set(allowedOperations);
export function isClientOperation(method: string, template: string) {
  return clientOperations.has(`${method} ${template}`);
}
export function requiresSchoolContext(path: string) {
  return /^\/api\/v1\/(academic|organization|reports)\//.test(path);
}
export function contextSignature(context: {
  workspaceType: string;
  organizationId: string | null;
  membershipId: string | null;
  activeRole: string | null;
  subjectOrganizationPersonId: string | null;
}) {
  return JSON.stringify([
    context.workspaceType,
    context.organizationId,
    context.membershipId,
    context.activeRole,
    context.subjectOrganizationPersonId,
  ]);
}
