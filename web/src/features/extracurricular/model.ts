import * as uiText from '@/content/fa';
export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'NeedsRevision'
  | 'Rejected'
  | 'Approved'
  | 'Cancelled';
export type ClassStatus = 'Provisioning' | 'ProvisioningFailed' | 'Setup' | 'Active' | 'Archived';
export type MemberRole = 'Manager' | 'Teacher' | 'Learner';
export type MembershipStatus = 'Active' | 'Removed' | 'Left';
export type ResponseStatus = 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Revoked';
export type JoinStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type ClassDraft = {
  title: string;
  description: string;
  subject: string;
  level: string;
  capacity: string;
  admission: string;
  managerUserId: string;
  teacherUserId: string;
  allowInvites: boolean;
  allowRequests: boolean;
  acceptedRules: boolean;
};
export type FormationRequest = {
  id: string;
  requesterId: string;
  status: RequestStatus;
  draft: ClassDraft;
  version: number;
  reason?: string;
  classId?: string;
  submittedAt?: string;
  history: { status: RequestStatus; time: string; reason?: string }[];
};
export type ClassMember = {
  id: string;
  userId: string;
  name: string;
  localName: string;
  note: string;
  roles: MemberRole[];
  status: MembershipStatus;
};
export type IndependentClass = {
  id: string;
  requestId: string;
  title: string;
  description: string;
  capacity: number;
  status: ClassStatus;
  version: number;
  managerUserId: string;
  teacherUserId?: string;
  managerAccepted: boolean;
  group: { id: string; ready: boolean };
  channel: { id: string; ready: boolean };
  members: ClassMember[];
};
export type ClassInvitation = {
  id: string;
  classId: string;
  userId: string;
  status: ResponseStatus;
  expiresAt: string;
  message?: string;
};
export type JoinRequest = {
  id: string;
  classId: string;
  userId: string;
  name: string;
  status: JoinStatus;
  reason?: string;
};
export type PreviewState = {
  requests: FormationRequest[];
  classes: IndependentClass[];
  invitations: ClassInvitation[];
  joins: JoinRequest[];
  operations: Record<string, { entityId: string; kind: string }>;
};
export const requestLabels: Record<RequestStatus, string> = {
  Draft: uiText.text_410c47c7f8b7,
  Submitted: uiText.text_d2bf2d21c42a,
  UnderReview: uiText.text_f71cd91dad22,
  NeedsRevision: uiText.text_952c0b87e7ca,
  Rejected: uiText.text_c7009e8ab420,
  Approved: uiText.text_10e8b9595ec0,
  Cancelled: uiText.text_7a56ac65be94,
};
export const classLabels: Record<ClassStatus, string> = {
  Provisioning: uiText.text_99f45229feff,
  ProvisioningFailed: uiText.text_ba1f3f7a99ea,
  Setup: uiText.text_f0e31d24a6c1,
  Active: uiText.text_a3fa2a3ffcb9,
  Archived: uiText.text_9defd77e1a5d,
};
export class ClassFlowError extends Error {
  constructor(
    public readonly code:
      | 'ContractRequired'
      | 'Validation'
      | 'Conflict'
      | 'Forbidden'
      | 'CapacityFull'
      | 'Expired'
      | 'NotFound',
    message: string,
  ) {
    super(message);
    this.name = 'ClassFlowError';
  }
}
export function emptyClassDraft(userId: string): ClassDraft {
  return {
    title: '',
    description: '',
    subject: '',
    level: '',
    capacity: uiText.text_59b3401e2289,
    admission: '',
    managerUserId: userId,
    teacherUserId: '',
    allowInvites: true,
    allowRequests: true,
    acceptedRules: false,
  };
}
export function normalizeClassNumber(value: string) {
  return value
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));
}
export function validateClassDraft(
  draft: ClassDraft,
  step: 'details' | 'audience' | 'management' | 'review',
) {
  const errors: Partial<Record<keyof ClassDraft, string>> = {};
  if (step === 'details' || step === 'review') {
    if (draft.title.trim().length < 3 || draft.title.trim().length > 120)
      errors.title = uiText.text_f1187b8fb0df;
    if (draft.description.trim().length < 30) errors.description = uiText.text_d9aff55e47e0;
    if (!draft.subject.trim()) errors.subject = uiText.text_80f4d9ca1657;
  }
  if (step === 'audience' || step === 'review') {
    const capacity = Number(normalizeClassNumber(draft.capacity));
    if (!Number.isSafeInteger(capacity) || capacity < 1) errors.capacity = uiText.text_4f914334ef4d;
    if (!draft.level.trim()) errors.level = uiText.text_793067d287e1;
    if (!draft.admission.trim()) errors.admission = uiText.text_31abf2eac258;
    if (!draft.allowInvites || !draft.allowRequests)
      errors.allowRequests = uiText.text_688356a6c572;
  }
  if ((step === 'management' || step === 'review') && !draft.managerUserId)
    errors.managerUserId = uiText.text_6edbc574bccb;
  if (step === 'review' && !draft.acceptedRules) errors.acceptedRules = uiText.text_89b07c876ce1;
  return errors;
}
export function activeClassMember(value: IndependentClass, userId: string) {
  return value.members.find((member) => member.userId === userId && member.status === 'Active');
}
export function classPermissions(value: IndependentClass, userId: string) {
  const member = activeClassMember(value, userId);
  const manager =
    !!member?.roles.includes('Manager') && value.managerUserId === userId && value.managerAccepted;
  const active = value.status === 'Active';
  return {
    canRead: !!member,
    canWrite: !!member && active,
    canManage: manager && active,
    canTeach: !!member?.roles.includes('Teacher') && active,
    canStart: manager && value.status === 'Setup' && value.group.ready && value.channel.ready,
    canRetry: manager && value.status === 'ProvisioningFailed',
    canArchive: manager && active,
  };
}
export function requireVersion(actual: number, expected: number) {
  if (actual !== expected) throw new ClassFlowError('Conflict', uiText.text_3f860a9bf2f2);
}
export function requireClassMember(value: IndependentClass, userId: string) {
  if (!activeClassMember(value, userId))
    throw new ClassFlowError('Forbidden', uiText.text_f7469ed3b23b);
}
export function requireClassManager(value: IndependentClass, userId: string) {
  requireClassMember(value, userId);
  if (value.managerUserId !== userId || !value.managerAccepted)
    throw new ClassFlowError('Forbidden', uiText.text_2aa5723f1ea1);
}
export function requireAvailableCapacity(value: IndependentClass, userId: string) {
  if (activeClassMember(value, userId)) return;
  if (value.status !== 'Active') throw new ClassFlowError('Forbidden', uiText.text_f717d6b7605b);
  if (
    value.members.filter((m) => m.status === 'Active' && m.roles.includes('Learner')).length >=
    value.capacity
  )
    throw new ClassFlowError('CapacityFull', uiText.text_a63386a0bf02);
}
