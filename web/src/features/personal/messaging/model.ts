import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
export type Conversation = components['schemas']['ManagedConversationResult'];
// Server capabilities are authoritative. Profile age and school role do not grant access.
export function canAttachConversation(conversation: Conversation, userId: string) {
  return canWriteConversation(conversation, userId);
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
  if (conversation.type === 'Group' || conversation.type === 'Channel')
    return conversation.effectiveCapabilities?.canPublish === true;
  return conversation.participants.some(
    (member) => member.user.userId === userId && member.status === 'Active',
  );
}
export function conversationTitle(
  conversation: components['schemas']['ConversationSummaryResult'],
) {
  return (
    conversation.title ||
    conversation.otherParticipant?.displayName ||
    conversation.otherParticipant?.username ||
    uiText.text_99c891fdab48
  );
}
export function visibleReply(reply: components['schemas']['MessageReplySummaryResult']) {
  return !reply
    ? null
    : reply.isUnavailable
      ? uiText.text_1ca12aac9cb5
      : reply.isDeleted
        ? uiText.text_c130dae89f48
        : reply.text || uiText.text_9b48d3d38fcb;
}
export const conversationRoleLabels = {
  Owner: uiText.text_ebe0eef2c257,
  Admin: uiText.text_c420e4b83a1f,
  Member: uiText.text_171874b82f6c,
} as const;
