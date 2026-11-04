import { it, describe, expect } from 'vitest';
import type { components } from '@/generated/api/schema';
import {
  canForwardMessage,
  validForwardReceipt,
  validReportReceipt,
} from '@/features/personal/messaging/message-action-policy';
type S = components['schemas'];
const message = {
  kind: 'Text',
  attachments: [],
  isDeleted: false,
  academicActivity: null,
} as unknown as S['ConversationMessageResult'];
describe('message action authority and receipts', () => {
  it('requires writable personal text and excludes educational and attached content', () => {
    expect(canForwardMessage(message, { scope: 'Personal' }, true)).toBe(true);
    for (const summary of [
      { scope: 'Organization' },
      { scope: 'Personal', isOfficial: true },
      { scope: 'Personal', managementPolicy: 'SystemManagedAcademic' },
    ] as const)
      expect(canForwardMessage(message, summary, true)).toBe(false);
    expect(canForwardMessage(message, { scope: 'Personal' }, false)).toBe(false);
    expect(canForwardMessage({ ...message, isDeleted: true }, { scope: 'Personal' }, true)).toBe(
      false,
    );
    expect(
      canForwardMessage(
        { ...message, attachments: [{}] as S['MessageAttachmentResult'][] },
        { scope: 'Personal' },
        true,
      ),
    ).toBe(false);
  });
  it('rejects a successful forward receipt for a different destination or operation', () => {
    const command = {
      destinationConversationId: 'target',
      clientMessageId: 'operation',
    } as S['ForwardMessageCommand'];
    const receipt = {
      status: 'Sent',
      conversationId: 'target',
      clientMessageId: 'operation',
    } as S['MessageReceiptResult'];
    expect(validForwardReceipt(receipt, command)).toBe(true);
    expect(validForwardReceipt({ ...receipt, conversationId: 'elsewhere' }, command)).toBe(false);
    expect(validForwardReceipt({ ...receipt, clientMessageId: 'other' }, command)).toBe(false);
  });
  it('binds a report receipt to the exact readable source and reason', () => {
    const command = {
      clientReportId: 'id',
      reason: 'Spam',
      description: null,
    } as S['ReportMessageCommand'];
    const receipt = {
      reportId: 'receipt',
      conversationId: 'conversation',
      messageId: 'message',
      reason: 'Spam',
    } as S['AbuseReportReceiptResult'];
    expect(validReportReceipt(receipt, 'conversation', 'message', command)).toBe(true);
    expect(
      validReportReceipt({ ...receipt, messageId: 'other' }, 'conversation', 'message', command),
    ).toBe(false);
    expect(
      validReportReceipt({ ...receipt, reason: 'Other' }, 'conversation', 'message', command),
    ).toBe(false);
  });
});
