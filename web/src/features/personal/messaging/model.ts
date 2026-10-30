import type { components } from '@/generated/api/schema';
export type Conversation = components['schemas']['ManagedConversationResult'];
// Compatibility with src/live/messenger-v3.ts in the existing client.
// This controls the composer only; server authorization remains authoritative.
function hasMessagingFlag(value: string, flag: 'SendMessages' | 'PublishMessages' | 'SendMedia') {
  const names = value.split(',').map((item) => item.trim());
  return (
    names.includes(flag) ||
    names.includes('All') ||
    ((flag === 'SendMessages' || flag === 'SendMedia') && names.includes('LegacyMemberDefault')) ||
    (flag === 'PublishMessages' && names.includes('LegacyAdminDefault'))
  );
}
export function canAttachConversation(conversation: Conversation, userId: string) {
  if (!canWriteConversation(conversation, userId)) return false;
  const member = conversation.participants.find(
    (item) => item.user.userId === userId && item.status === 'Active',
  );
  return (
    conversation.type !== 'Group' ||
    member?.role === 'Owner' ||
    member?.role === 'Admin' ||
    hasMessagingFlag(conversation.memberCapabilities, 'SendMedia')
  );
}
export function mediaRestricted(restriction: {
  isEffective: boolean;
  isBanned: boolean;
  deniedCapabilities: string;
}) {
  const flags = restriction.deniedCapabilities.split(',').map((item) => item.trim());
  return (
    restriction.isEffective &&
    (restriction.isBanned ||
      flags.includes('All') ||
      flags.includes('SendMessages') ||
      flags.includes('SendMedia'))
  );
}
export function canWriteConversation(conversation: Conversation, userId: string) {
  if (conversation.status !== 'Active') return false;
  const member = conversation.participants.find(
    (item) => item.user.userId === userId && item.status === 'Active',
  );
  if (!member) return false;
  if (conversation.type === 'Channel')
    return (
      member.role === 'Owner' ||
      (member.role === 'Admin' && hasMessagingFlag(member.adminPermissions, 'PublishMessages'))
    );
  if (conversation.type === 'Group')
    return (
      member.role === 'Owner' ||
      member.role === 'Admin' ||
      hasMessagingFlag(conversation.memberCapabilities, 'SendMessages')
    );
  return conversation.type === 'Direct' || conversation.type === 'Saved';
}
export function conversationTitle(
  conversation: components['schemas']['ConversationSummaryResult'],
) {
  return (
    conversation.title ||
    conversation.otherParticipant?.displayName ||
    conversation.otherParticipant?.username ||
    'گفت‌وگو'
  );
}
export function visibleReply(reply: components['schemas']['MessageReplySummaryResult']) {
  return !reply
    ? null
    : reply.isUnavailable
      ? 'پیام در دسترس نیست'
      : reply.isDeleted
        ? 'پیام حذف شده است'
        : reply.text || 'پیوست';
}
export const conversationRoleLabels = {
  Owner: 'مالک گفت‌وگو',
  Admin: 'مدیر گفت‌وگو',
  Member: 'عضو',
} as const;
