'use client';
import * as uiText from '@/content/fa';
import { isRecord } from '@/lib/api/errors';
import { date, number } from '@/lib/formatting';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, label, StatusBadge } from './states';
export const fieldLabels: Record<string, string> = {
  startDate: uiText.text_5590d86b3dea,
  endDate: uiText.text_ff65d97ad1e0,
  verifiedBirthDate: uiText.text_ebce34bb1c4a,
  classification: uiText.text_05f95b7e152f,
  verificationStatus: uiText.text_53a6da0c6927,
  startUtc: uiText.text_0d5f82b11e8c,
  endUtc: uiText.text_0559b65628ea,
  timeZoneId: uiText.text_77fe79f8b1d7,
  effectiveFrom: uiText.text_b0dff0a118df,
  effectiveUntil: uiText.text_0ae1c94970fd,
  applyFromDate: uiText.text_1931110c90ec,
  durationMinutes: uiText.text_2fa08bbfc67b,
  localStartTime: uiText.text_9eebbbd0d478,
  localDayOfWeek: uiText.text_8ab1f725756d,
  finalStatus: uiText.text_7a1808af5aca,
  correctionReason: uiText.text_0182ac3cd11f,
  entries: uiText.text_f520b8218622,
  managers: uiText.text_8b30165d42c3,
  memberships: uiText.text_5947286b4663,
  administrativeHistory: uiText.text_993403330924,
  teachers: uiText.text_46b599145ed6,
  revisions: uiText.text_4071fd698a3b,
  id: uiText.text_308c293e8b53,
  name: uiText.text_69c1e5b1fe20,
  displayName: uiText.text_5903c1c121cb,
  title: uiText.text_74190f4bb095,
  status: uiText.text_68d7eb08efbc,
  createdAtUtc: uiText.text_742e604e8e1b,
  updatedAtUtc: uiText.text_a8f9b3f5cc46,
  firstName: uiText.text_69c1e5b1fe20,
  lastName: uiText.text_3fe7ba4a2131,
  organizationId: uiText.text_7e234e8e9904,
  userId: uiText.text_4a795ccb62e4,
  personId: uiText.text_3bb5743bc2f0,
  organizationPersonId: uiText.text_c3582a73bab4,
  membershipId: uiText.text_4ec1390ba9aa,
  enrollmentId: uiText.text_bbcb51445ff6,
  classId: uiText.text_5b23cc0c1f21,
  academicPeriodId: uiText.text_ac297f82c6e7,
  courseId: uiText.text_c2a4e30c7788,
  activeClassCount: uiText.text_e85db0fb2a48,
  enrolledLearnerCount: uiText.text_654c82264de7,
  teacherCount: uiText.text_65ff4b748f76,
  activeMemberCount: uiText.text_1e148080c7c2,
  activeManagerCount: uiText.text_f3afec354d34,
  totalCount: uiText.text_2a9c76274de8,
  activeCount: uiText.text_8c70ab4fb230,
  totalCapacity: uiText.text_d9748d649211,
  scheduled: uiText.text_48ba2fffd7f8,
  completed: uiText.text_6cfe19c556aa,
  cancelled: uiText.text_7a56ac65be94,
  total: uiText.text_e892623fb9be,
  present: uiText.text_40284b78e717,
  absent: uiText.text_921c15ca4d6d,
  late: uiText.text_5d5d32eb4327,
  excused: uiText.text_85a79064a177,
  totalRecords: uiText.text_e4420d10f87b,
  totalAssignments: uiText.text_cd13e88ef404,
  publishedAssignments: uiText.text_1e14155e407c,
  totalExams: uiText.text_222b356f3f35,
  publishedExams: uiText.text_1c38b8b982c9,
  pendingCount: uiText.text_caac18ea6580,
  processingCount: uiText.text_68bfe264e2cf,
  deferredCount: uiText.text_aecb7a8c912b,
  failedCount: uiText.text_bbd429973d6e,
  oldestQueuedAgeSeconds: uiText.text_d25fcdaecd72,
  pushProviderAvailability: uiText.text_9c9396f1a06b,
  smsProviderAvailability: uiText.text_1b2b3ea6b82d,
  recentFailures: uiText.text_a518bb98ae8c,
  counts: uiText.text_e7c31b41ea16,
  oldestPendingAtUtc: uiText.text_44eb8186c1b4,
  dependencies: uiText.text_f0f59808ac85,
  notifications: uiText.text_9f2a436a61f3,
  jobs: uiText.text_a84b9fb71dda,
  observedAtUtc: uiText.text_49f22b1f96ce,
  aiIntegrationStatus: uiText.text_38ba5d1b15db,
  activeMembershipCount: uiText.text_90558504ae69,
  activeSubscriptionCount: uiText.text_18f98f08ce1c,
  pendingInvitationCount: uiText.text_3d4c3d92cfad,
  pendingProvisioningCount: uiText.text_db836ee463e1,
  lastMembershipCreatedAtUtc: uiText.text_8b848237295a,
  lastClassCreatedAtUtc: uiText.text_bb4fb9f12d35,
  lastAdministrativeActionAtUtc: uiText.text_e4b085a7ea07,
  guardianUserId: uiText.text_d76325eba9c3,
  learnerOrganizationPersonId: uiText.text_b8f84501bb7c,
  validFromUtc: uiText.text_9d8f5adfae13,
  endedAtUtc: uiText.text_ff65d97ad1e0,
  capacity: uiText.text_57400196e6de,
  courseTitle: uiText.text_8c471f14ee5a,
  academicPeriodTitle: uiText.text_5f681ac52334,
  isAccountLinked: uiText.text_76e5a8315199,
  canEditNames: uiText.text_60af73fe5d81,
  phoneNumber: uiText.auth_phoneLabel,
  maskedPhone: uiText.auth_phoneLabel,
  username: uiText.text_173fec6019a6,
  mobileVerified: uiText.text_ce6eae278252,
  accountStatus: uiText.text_1910a7860abd,
  suspendedAtUtc: uiText.text_86095dafad16,
  startsAtUtc: uiText.text_103613fd03b5,
  endsAtUtc: uiText.text_3f05817a3011,
  startAtUtc: uiText.text_103613fd03b5,
  endAtUtc: uiText.text_3f05817a3011,
  amount: uiText.text_30de87b72026,
  currency: uiText.text_70d8318bc91d,
  orderId: uiText.text_653511a083ed,
  planVersionId: uiText.text_0e36a5dfa8ee,
  purchaserUserId: uiText.text_7054050077e9,
  paidAtUtc: uiText.text_7b9579b94f67,
  cancelledAtUtc: uiText.text_31d0bfe46078,
  paymentAttempts: uiText.text_c53d26c05fe0,
  payment: uiText.text_2ecccfdf9f11,
  code: uiText.text_7f34ceb3adea,
  key: uiText.text_2a09cd5be19f,
  value: uiText.text_70fad032e576,
  limit: uiText.text_7ce1cba4ec7f,
  currentUsage: uiText.text_cf7022e3986a,
  isOverQuota: uiText.text_1efbc9ce0237,
  usage: uiText.text_baf03394ac0e,
  planCode: uiText.text_6c39153fbad5,
  planName: uiText.text_fd1e40a5bdd8,
  subscriptionId: uiText.text_3f2157f7e54e,
  versionNumber: uiText.text_95620197c174,
  version: uiText.text_e1280ac99b7b,
  rowVersion: uiText.text_0ff68b6d8f6e,
  personRowVersion: uiText.text_272c50142df4,
  reason: uiText.text_ecaf3518c67b,
  internalNote: uiText.text_680750d60932,
  action: uiText.text_d7fab0be6672,
  occurredAtUtc: uiText.text_a02552f393fb,
  result: uiText.text_def9c18e11d0,
  targetType: uiText.text_23625d3dd421,
  targetId: uiText.text_2027e49d43d6,
  beforeSummary: uiText.text_7ca084f7ac14,
  afterSummary: uiText.text_9f07f0f6780c,
  correlationId: uiText.text_0bdac76e5955,
  actorUserId: uiText.text_b07e2ff9dbeb,
  actorPersonId: uiText.text_3db261daa3a7,
  actorSessionId: uiText.text_620a0e304a39,
  sessionId: uiText.text_02739cab4997,
  expiresAtUtc: uiText.text_57a327e6fbb1,
  isActive: uiText.text_9e2c3acdab37,
  revokedAtUtc: uiText.text_ed621a0238f4,
  deviceName: uiText.text_f7c6ee7ceb27,
  isCurrent: uiText.text_2f64cf5265fc,
  activeRoles: uiText.text_fde889f86d84,
  role: uiText.text_628d512903fe,
  roleKey: uiText.text_02626023297b,
  roleId: uiText.text_5cff6c4ff277,
  roleDisplayName: uiText.text_48dabbd6c038,
  grantedAtUtc: uiText.text_dfb434e36223,
  grantedByUserId: uiText.text_006e40fe4688,
  endedByUserId: uiText.text_f165b59f91b4,
  assignmentId: uiText.text_d52bea756b32,
  classTitle: uiText.text_b7556a00d773,
  priority: uiText.text_ef621ef609a9,
  source: uiText.text_8a52f7bc3f5c,
  caseId: uiText.text_60427fc5763e,
  conversationId: uiText.text_ee23edf8ff48,
  type: uiText.text_b55501074dc5,
  scope: uiText.text_0125c8b7a2e6,
  visibility: uiText.text_b7978697f77a,
  moderationCaseCount: uiText.text_005887ba201a,
  assignedReviewerUserId: uiText.text_c8b0013b2c43,
  reviewStartedAtUtc: uiText.text_95c451376fbf,
  resolvedAtUtc: uiText.text_cc21d597a870,
  dismissedAtUtc: uiText.text_1890bec4f76d,
  contentSnapshot: uiText.text_a1796a7b71bd,
  description: uiText.text_6b12f15e748d,
  messageKind: uiText.text_02aebeb902e8,
  messageId: uiText.text_798f6ffaf2c1,
  reportedUserId: uiText.text_873c6ff87053,
  reporterUserId: uiText.text_491a50e60976,
  reportId: uiText.text_01ddc3f9e885,
  incidentId: uiText.text_5273e78543f3,
  decision: uiText.text_cdbc42133852,
  riskLevel: uiText.text_3a4b8be4d460,
  policyCodes: uiText.text_e6e1c3de343b,
  text: uiText.text_17af7e2762dc,
  sentAtUtc: uiText.text_4889997d4069,
  senderUserId: uiText.text_9458ff04f996,
  sequence: uiText.text_9a570ad9e59b,
  kind: uiText.text_b55501074dc5,
  organizationName: uiText.text_79976c6e3e70,
  clientOperationId: uiText.text_38e00c7ec49a,
  failureCode: uiText.text_5752a5625ae1,
  replayed: uiText.text_1f7b7903479e,
  organization: uiText.text_b362329dff90,
  teacherAssignmentId: uiText.text_339ffded192f,
  activeTeacherCount: uiText.text_d28d9124f395,
  activeLearnerCount: uiText.text_90906f384f7e,
  enrolledAtUtc: uiText.text_aaf7c2e138a5,
  assignedAtUtc: uiText.text_1afe50e359f3,
  publishedAtUtc: uiText.text_ff0ac33fa30b,
  currentTitle: uiText.text_d28d227a202d,
  currentVersionNumber: uiText.text_ac50640bdd8f,
  currentMaxScore: uiText.text_b0d05ff19b4c,
  priceAmount: uiText.text_30de87b72026,
  entitlements: uiText.text_0f62c687cc01,
  quotas: uiText.text_0419a14f7b35,
  enabled: uiText.text_a3fa2a3ffcb9,
  subscriptionCount: uiText.text_7db7c5d775dc,
  versionsTruncated: uiText.text_bdf1e49e12f5,
  totalAsGuardian: uiText.text_a7e2256a2bb3,
  totalAsLearner: uiText.text_217524cb04e9,
  dataAsOfUtc: uiText.text_8e6397a74fe1,
  operationalCounts: uiText.text_7697e2d3e5ed,
  upcomingSessions: uiText.text_01ddedeb35a3,
  attendancePending: uiText.text_3f42a06dca7e,
  assignmentGradingQueue: uiText.text_0a08e6588d38,
  examGradingQueue: uiText.text_f89aaf7b0ba9,
  onboarding: uiText.text_5a23f9bc81ef,
  meetingUrl: uiText.text_674005a94547,
  sessionTitle: uiText.text_70786012eed4,
  attendanceStatus: uiText.text_5f78cf2b8f06,
  learnerDisplayName: uiText.text_300a5980d7c6,
  teacherDisplayName: uiText.text_6b42512b7cc4,
  sessionCount: uiText.text_d57ba7ac55c7,
  attendanceCount: uiText.text_49516bc7d218,
  learnerCount: uiText.text_6b029cd67b61,
  classCount: uiText.text_288df4810c4a,
  assessmentCount: uiText.text_864d620a79a5,
  averageScore: uiText.text_5a8bdfe42139,
  count: uiText.text_8453cbdcb655,
  available: uiText.text_345cb60b5d2c,
  health: uiText.text_56da3a96a644,
  component: uiText.text_149f9194eaaa,
  detail: uiText.text_4f7585cf0c64,
};
export function IdCopy({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <>{uiText.text_bda050585a00}</>;
  return (
    <span className="id-copy" dir="ltr">
      <span>{value}</span>
      <button
        aria-label={uiText.text_4d37bd3ee4fe}
        onClick={() =>
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          })
        }
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  );
}
export function Value({ value, name = '' }: { value: unknown; name?: string }) {
  if (value == null) return <span className="text-muted">{uiText.text_bda050585a00}</span>;
  if (typeof value === 'boolean')
    return <span>{value ? uiText.text_13159f8c7432 : uiText.text_5f5c4c72bddd}</span>;
  if (typeof value === 'number') return <>{number(value)}</>;
  if (typeof value === 'string') {
    if (['phoneNumber', 'maskedPhone'].includes(name.split('.').pop() ?? name))
      return (
        <bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>
          {value || '—'}
        </bdi>
      );
    if (
      /(?:AtUtc|FromUtc|ToUtc|UntilUtc|startUtc|endUtc|deadlineUtc|startDate|endDate)$/.test(name)
    )
      return <>{date(value, true)}</>;
    if (
      /^(?:status|accountStatus|role|activeRole|type|scope|visibility)$/.test(
        name.split('.').pop() ?? name,
      )
    )
      return <StatusBadge value={value} />;
    if (/Id$/.test(name) || name === 'id') return <IdCopy value={value} />;
    return <span style={{ whiteSpace: 'pre-wrap' }}>{label(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted">{uiText.text_8e5c8a3097a2}</span>;
    return (
      <div>
        {value.map((v, i) =>
          isRecord(v) ? (
            <div className="nested-block" key={i}>
              <DataView value={v} />
            </div>
          ) : (
            <span className="badge badge-neutral me-1 mb-1" key={i}>
              {String(v)}
            </span>
          ),
        )}
      </div>
    );
  }
  if (isRecord(value)) return <DataView value={value} />;
  return <>{uiText.text_bda050585a00}</>;
}
export function DataView({
  value,
  fields,
  hide = [],
}: {
  value: unknown;
  fields?: string[];
  hide?: string[];
}) {
  if (!isRecord(value)) return <EmptyState title={uiText.text_f7c559a128a8} />;
  const entries = Object.entries(value).filter(
    ([key]) =>
      (!fields || fields.includes(key)) &&
      !hide.includes(key) &&
      !['accessToken', 'refreshToken', 'setupUri', 'recoveryCodes'].includes(key),
  );
  return (
    <div className="view-grid">
      {entries.map(([key, v]) => (
        <div
          key={key}
          className={`view-field ${typeof v === 'object' && v !== null ? 'wide' : ''}`}
        >
          <span>{fieldLabels[key] ?? key}</span>
          <Value value={v} name={key} />
        </div>
      ))}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
