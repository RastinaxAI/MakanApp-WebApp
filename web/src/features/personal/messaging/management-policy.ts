import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function canManageMembers(value: S['ManagedConversationResult'], userId: string) {
  return (
    value.managementPolicy === 'UserManaged' &&
    value.participants.some(
      (m) => m.user.userId === userId && m.status === 'Active' && m.role === 'Owner',
    )
  );
}
