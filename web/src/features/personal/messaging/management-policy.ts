import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function conversationCapability(
  value: Pick<S['ManagedConversationResult'], 'effectiveCapabilities'>,
  key: keyof S['ConversationEffectiveCapabilities'],
) {
  return value.effectiveCapabilities?.[key] === true;
}
export function canManageMembers(value: S['ManagedConversationResult'], _userId?: string) {
  return conversationCapability(value, 'canManageMembers');
}
export function canManageConversation(value: S['ManagedConversationResult']) {
  return [
    'canEditInfo',
    'canManageMembers',
    'canManageAdmins',
    'canChangeSettings',
    'canManageInvites',
    'canManageTopics',
  ].some((key) =>
    conversationCapability(value, key as keyof S['ConversationEffectiveCapabilities']),
  );
}
