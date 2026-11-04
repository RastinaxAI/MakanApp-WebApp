import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function canForwardMessage(
  message: S['ConversationMessageResult'],
  summary:
    | {
        scope: S['ConversationScope'];
        isOfficial?: boolean;
        official?: S['OfficialSpaceMetadata'];
        managementPolicy?: S['ConversationManagementPolicy'];
      }
    | undefined,
  writable: boolean,
) {
  return (
    !!summary &&
    writable &&
    !message.isDeleted &&
    message.kind === 'Text' &&
    !message.attachments.length &&
    !message.academicActivity &&
    summary.scope === 'Personal' &&
    summary.managementPolicy !== 'SystemManagedAcademic' &&
    !summary.isOfficial &&
    !summary.official
  );
}
export function validForwardReceipt(
  receipt: S['MessageReceiptResult'],
  command: S['ForwardMessageCommand'],
) {
  return (
    receipt.status === 'Sent' &&
    receipt.conversationId === command.destinationConversationId &&
    receipt.clientMessageId === command.clientMessageId
  );
}
export function validReportReceipt(
  receipt: S['AbuseReportReceiptResult'],
  conversationId: string,
  messageId: string,
  command: S['ReportMessageCommand'],
) {
  return (
    receipt.conversationId === conversationId &&
    receipt.messageId === messageId &&
    receipt.reason === command.reason &&
    !!receipt.reportId
  );
}
