import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export const quotaLabels: Record<S['QuotaKey'], string> = {
  ActiveLearners: uiText.text_f70724393adb,
  ActiveClasses: uiText.text_9d936eeca4e2,
  StorageBytes: uiText.text_09e7817faae8,
  ReportExports: uiText.text_7339f30732c3,
  AiTextRequests: uiText.text_63c6b878af2c,
  SourceCount: uiText.text_3b15ef5a6e60,
  AssignmentFileBytes: uiText.text_5bc9b434eaf1,
};
export const subscriptionLabels: Record<S['SubscriptionDisplayState'], string> = {
  NoSubscription: uiText.text_06899237ef70,
  PendingPayment: uiText.text_8bcc64d644fd,
  Active: uiText.text_a3fa2a3ffcb9,
  QuotaWarning: uiText.text_24a352fc659b,
  QuotaExceeded: uiText.text_68f93808bd2c,
  GracePeriod: uiText.text_9a43cbcedd12,
  Expired: uiText.text_7e138dc09ad6,
  ScheduledDowngrade: uiText.text_84999279bbdd,
  LegacyPendingContract: uiText.text_4b48621f7c39,
};
export function quotaRemaining(q: S['CommercialQuotaDto']) {
  if (q.isUnlimited === true) return uiText.text_5e6ee5eaa1fe;
  if (q.isUsageAvailable !== true || q.remaining === null) return uiText.text_257b66a50f43;
  return q.remaining.toLocaleString('fa-IR') + ' ' + q.unit;
}
export function summaryMatches(
  s: S['CommercialSummaryDto'],
  owner: 'Individual' | 'Organization',
  id: string | null,
) {
  return s.ownerType === owner && !!id && s.ownerId === id;
}
