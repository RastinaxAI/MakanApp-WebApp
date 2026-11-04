import * as uiText from '@/content/fa';
import type { ExtracurricularService } from './service';
import type {
  ClassDraft,
  FormationRequest,
  IndependentClass,
  PreviewState,
  RequestStatus,
} from './model';
import {
  ClassFlowError,
  emptyClassDraft,
  validateClassDraft,
  normalizeClassNumber,
  requireVersion,
  requireClassManager,
  requireAvailableCapacity,
  activeClassMember,
} from './model';

export const previewAccount = { id: 'preview-sara', name: uiText.text_ef48d2bacaf5 };
export const sampleClassDraft: ClassDraft = {
  ...emptyClassDraft(previewAccount.id),
  title: uiText.text_fed0b556b58c,
  description: uiText.text_008586e08151,
  subject: uiText.text_1868e63faf08,
  level: uiText.text_d2e507c244ab,
  capacity: uiText.text_59b3401e2289,
  admission: uiText.text_d2ae39d74879,
  acceptedRules: true,
};
export function samplePreviewState(): PreviewState {
  return {
    requests: [
      {
        id: 'request-story',
        requesterId: previewAccount.id,
        status: 'UnderReview',
        draft: { ...sampleClassDraft },
        version: 1,
        submittedAt: '2026-11-02T06:42:00Z',
        history: [
          { status: 'Submitted', time: '2026-11-02T06:42:00Z' },
          { status: 'UnderReview', time: '2026-11-02T07:00:00Z' },
        ],
      },
    ],
    classes: [
      {
        id: 'class-story',
        requestId: 'request-approved',
        title: sampleClassDraft.title,
        description: sampleClassDraft.description,
        capacity: 20,
        status: 'Active',
        version: 1,
        managerUserId: previewAccount.id,
        managerAccepted: true,
        group: { id: 'group-story', ready: true },
        channel: { id: 'channel-story', ready: true },
        members: [
          {
            id: 'member-sara',
            userId: previewAccount.id,
            name: previewAccount.name,
            localName: '',
            note: '',
            roles: ['Manager'],
            status: 'Active',
          },
          ...[
            uiText.text_9c3669598c7a,
            uiText.text_77f943ba162c,
            uiText.text_602aeb223572,
            uiText.text_0c6c7aa47c3f,
            uiText.text_0588ef74a16d,
            uiText.text_91ed8760e42c,
            uiText.text_118676445db4,
            uiText.text_0eb36cac99c8,
            uiText.text_858b67b3d41d,
            uiText.text_6992655043e6,
            uiText.text_d81d33db215b,
          ].map((name, index) => ({
            id: 'member-' + index,
            userId: 'preview-member-' + index,
            name,
            localName: '',
            note: '',
            roles: ['Learner'] as ['Learner'],
            status: 'Active' as const,
          })),
        ],
      },
    ],
    invitations: [
      {
        id: 'invitation-story',
        classId: 'class-story',
        userId: previewAccount.id,
        status: 'Pending',
        expiresAt: '2026-11-09T10:00:00Z',
      },
    ],
    joins: [
      {
        id: 'join-maryam',
        classId: 'class-story',
        userId: 'preview-join-maryam',
        name: uiText.text_77f943ba162c,
        status: 'Pending',
      },
      {
        id: 'join-ali',
        classId: 'class-story',
        userId: 'preview-join-ali',
        name: uiText.text_4798fc2480e7,
        status: 'Pending',
      },
    ],
    operations: {},
  };
}
/** Explicit synthetic adapter. Never selected as a fallback after a real API failure. */
export class PreviewClassService implements ExtracurricularService {
  readonly mode = 'preview' as const;
  private state: PreviewState;
  constructor(
    private actor: { id: string; name: string; reviewer?: boolean },
    state = samplePreviewState(),
    private notify: (value: PreviewState) => void = () => {},
    private now = () => new Date().toISOString(),
  ) {
    this.state = structuredClone(state);
  }
  snapshot() {
    return structuredClone(this.state);
  }
  private changed() {
    this.notify(this.snapshot());
  }
  private request(id: string) {
    const value = this.state.requests.find((x) => x.id === id);
    if (!value) throw new ClassFlowError('NotFound', uiText.text_642850f8c790);
    return value;
  }
  private class(id: string) {
    const value = this.state.classes.find((x) => x.id === id);
    if (!value) throw new ClassFlowError('NotFound', uiText.text_4c526956ac52);
    return value;
  }
  private own(value: FormationRequest) {
    if (value.requesterId !== this.actor.id)
      throw new ClassFlowError('Forbidden', uiText.text_6c60533bd66d);
  }
  private replay(operation: string, kind: string) {
    const old = this.state.operations[operation];
    if (old && old.kind !== kind) throw new ClassFlowError('Conflict', uiText.text_7295d5d91a51);
    return old?.entityId;
  }
  private recorded(operation: string, kind: string, entityId: string) {
    this.state.operations[operation] = { kind, entityId };
    this.changed();
  }
  async listRequests() {
    return structuredClone(
      this.state.requests.filter((x) => x.requesterId === this.actor.id || this.actor.reviewer),
    );
  }
  async listClasses() {
    return structuredClone(this.state.classes.filter((x) => activeClassMember(x, this.actor.id)));
  }
  async getClass(id: string) {
    const value = this.class(id);
    if (!activeClassMember(value, this.actor.id))
      throw new ClassFlowError('Forbidden', uiText.text_58b9d41376ea);
    return structuredClone(value);
  }
  async saveDraft(draft: ClassDraft, id?: string) {
    let value = id ? this.request(id) : undefined;
    if (value) {
      this.own(value);
      if (!['Draft', 'NeedsRevision'].includes(value.status))
        throw new ClassFlowError('Conflict', uiText.text_975bebc1b00b);
      value.draft = structuredClone(draft);
      value.version++;
    } else {
      value = {
        id: crypto.randomUUID(),
        requesterId: this.actor.id,
        status: 'Draft',
        draft: { ...structuredClone(draft), managerUserId: this.actor.id },
        version: 1,
        history: [],
      };
      this.state.requests.push(value);
    }
    this.changed();
    return structuredClone(value);
  }
  async submit(id: string, version: number, operation: string) {
    const previous = this.replay(operation, 'submit');
    if (previous) return structuredClone(this.request(previous));
    const value = this.request(id);
    this.own(value);
    requireVersion(value.version, version);
    if (!['Draft', 'NeedsRevision'].includes(value.status))
      throw new ClassFlowError('Conflict', uiText.text_702d0a0818b6);
    if (Object.keys(validateClassDraft(value.draft, 'review')).length)
      throw new ClassFlowError('Validation', uiText.text_dc077954d844);
    value.status = 'Submitted';
    value.version++;
    value.submittedAt = this.now();
    value.history.push({ status: 'Submitted', time: this.now() });
    this.recorded(operation, 'submit', id);
    return structuredClone(value);
  }
  async cancel(id: string, version: number, operation: string) {
    const previous = this.replay(operation, 'cancel');
    if (previous) return structuredClone(this.request(previous));
    const value = this.request(id);
    this.own(value);
    requireVersion(value.version, version);
    if (!['Draft', 'Submitted', 'NeedsRevision'].includes(value.status))
      throw new ClassFlowError('Conflict', uiText.text_4f502a6ac1cd);
    value.status = 'Cancelled';
    value.version++;
    value.history.push({ status: 'Cancelled', time: this.now() });
    this.recorded(operation, 'cancel', id);
    return structuredClone(value);
  }
  async decide(
    id: string,
    version: number,
    decision: Extract<RequestStatus, 'Approved' | 'Rejected' | 'NeedsRevision'>,
    reason: string,
    managerId: string,
    operation: string,
    teacherId?: string,
  ) {
    const previous = this.replay(operation, 'decide');
    if (previous) return structuredClone(this.request(previous));
    if (!this.actor.reviewer) throw new ClassFlowError('Forbidden', uiText.text_b754c5d5b5a0);
    const value = this.request(id);
    requireVersion(value.version, version);
    if (!['Submitted', 'UnderReview'].includes(value.status))
      throw new ClassFlowError('Conflict', uiText.text_c07f2df28da8);
    if (decision !== 'Approved' && !reason.trim())
      throw new ClassFlowError('Validation', uiText.text_766e2c802360);
    if (decision === 'Approved' && !managerId)
      throw new ClassFlowError('Validation', uiText.text_d9eecc571186);
    value.status = decision;
    value.reason = reason;
    value.version++;
    value.history.push({ status: decision, time: this.now(), reason });
    if (decision === 'Approved') {
      const finalTeacherId = teacherId ?? value.draft.teacherUserId;
      const classId = value.classId ?? crypto.randomUUID();
      value.classId = classId;
      this.state.classes.push({
        id: classId,
        requestId: id,
        title: value.draft.title,
        description: value.draft.description,
        capacity: Number(normalizeClassNumber(value.draft.capacity)),
        status: 'Provisioning',
        version: 1,
        managerUserId: managerId,
        teacherUserId: finalTeacherId || undefined,
        managerAccepted: managerId === value.requesterId,
        group: { id: crypto.randomUUID(), ready: true },
        channel: { id: crypto.randomUUID(), ready: false },
        members: [
          {
            id: crypto.randomUUID(),
            userId: managerId,
            name: managerId === this.actor.id ? this.actor.name : uiText.text_005d2e7ec4f6,
            localName: '',
            note: '',
            roles: finalTeacherId === managerId ? ['Manager', 'Teacher'] : ['Manager'],
            status: 'Active',
          },
        ],
      });
    }
    this.recorded(operation, 'decide', id);
    return structuredClone(value);
  }
  async retrySetup(id: string, version: number, operation: string) {
    const previous = this.replay(operation, 'retry');
    if (previous) return structuredClone(this.class(previous));
    const value = this.class(id);
    requireClassManager(value, this.actor.id);
    requireVersion(value.version, version);
    if (!['Provisioning', 'ProvisioningFailed'].includes(value.status))
      throw new ClassFlowError('Conflict', uiText.text_efea3936a78c);
    value.group.ready = true;
    value.channel.ready = true;
    value.status = 'Setup';
    value.version++;
    this.recorded(operation, 'retry', id);
    return structuredClone(value);
  }
  async acceptManagement(id: string, version: number, operation: string) {
    const previous = this.replay(operation, 'accept-manager');
    if (previous) return structuredClone(this.class(previous));
    const value = this.class(id);
    requireVersion(value.version, version);
    if (value.managerUserId !== this.actor.id)
      throw new ClassFlowError('Forbidden', uiText.text_3184331b379e);
    value.managerAccepted = true;
    value.version++;
    this.recorded(operation, 'accept-manager', id);
    return structuredClone(value);
  }
  async start(id: string, version: number, operation: string) {
    const previous = this.replay(operation, 'start');
    if (previous) return structuredClone(this.class(previous));
    const value = this.class(id);
    requireClassManager(value, this.actor.id);
    requireVersion(value.version, version);
    if (value.status !== 'Setup' || !value.group.ready || !value.channel.ready)
      throw new ClassFlowError('Conflict', uiText.text_6294aa425870);
    value.status = 'Active';
    value.version++;
    this.recorded(operation, 'start', id);
    return structuredClone(value);
  }
  async invite(
    id: string,
    userId: string,
    operation: string,
    options?: { expiresAt?: string; message?: string },
  ) {
    const previous = this.replay(operation, 'invite');
    if (previous) return structuredClone(this.state.invitations.find((x) => x.id === previous)!);
    const value = this.class(id);
    requireClassManager(value, this.actor.id);
    if (value.status !== 'Active') throw new ClassFlowError('Forbidden', uiText.text_212d8ef96e2c);
    if (!userId) throw new ClassFlowError('Validation', uiText.text_32a587b8058d);
    if (
      options?.expiresAt &&
      (!Number.isFinite(Date.parse(options.expiresAt)) ||
        Date.parse(options.expiresAt) <= Date.parse(this.now()))
    )
      throw new ClassFlowError('Validation', uiText.text_4955ad38697f);
    const old = this.state.invitations.find(
      (x) => x.classId === id && x.userId === userId && x.status === 'Pending',
    );
    const invite = old ?? {
      id: crypto.randomUUID(),
      classId: id,
      userId,
      status: 'Pending' as const,
      expiresAt:
        options?.expiresAt ?? new Date(Date.parse(this.now()) + 7 * 86400000).toISOString(),
      message: options?.message,
    };
    if (!old) this.state.invitations.push(invite);
    this.recorded(operation, 'invite', invite.id);
    return structuredClone(invite);
  }
  private addLearner(value: IndependentClass, userId: string, name: string) {
    requireAvailableCapacity(value, userId);
    if (!activeClassMember(value, userId))
      value.members.push({
        id: crypto.randomUUID(),
        userId,
        name,
        localName: '',
        note: '',
        roles: ['Learner'],
        status: 'Active',
      });
    value.version++;
  }
  async respondInvitation(id: string, accept: boolean, operation: string) {
    const previous = this.replay(operation, 'respond-invite');
    if (previous) return structuredClone(this.state.invitations.find((x) => x.id === previous)!);
    const value = this.state.invitations.find((x) => x.id === id);
    if (!value) throw new ClassFlowError('NotFound', uiText.text_0ac77ca3f59b);
    if (value.userId !== this.actor.id)
      throw new ClassFlowError('Forbidden', uiText.text_d8c621c9973b);
    if (value.status !== 'Pending' || Date.parse(value.expiresAt) <= Date.parse(this.now()))
      throw new ClassFlowError('Expired', uiText.text_1fc155b9fbc6);
    if (accept) this.addLearner(this.class(value.classId), this.actor.id, this.actor.name);
    value.status = accept ? 'Accepted' : 'Declined';
    if (accept)
      this.state.joins
        .filter(
          (x) =>
            x.classId === value.classId && x.userId === this.actor.id && x.status === 'Pending',
        )
        .forEach((x) => (x.status = 'Approved'));
    this.recorded(operation, 'respond-invite', id);
    return structuredClone(value);
  }
  async join(id: string, operation: string) {
    const previous = this.replay(operation, 'join');
    if (previous) return structuredClone(this.state.joins.find((x) => x.id === previous)!);
    const value = this.class(id);
    if (value.status !== 'Active') throw new ClassFlowError('Forbidden', uiText.text_a8a7b00622d8);
    const old = this.state.joins.find(
      (x) => x.classId === id && x.userId === this.actor.id && x.status === 'Pending',
    );
    const join = old ?? {
      id: crypto.randomUUID(),
      classId: id,
      userId: this.actor.id,
      name: this.actor.name,
      status: 'Pending' as const,
    };
    if (!old) this.state.joins.push(join);
    this.recorded(operation, 'join', join.id);
    return structuredClone(join);
  }
  async cancelJoin(id: string, operation: string) {
    const previous = this.replay(operation, 'cancel-join');
    if (previous) return structuredClone(this.state.joins.find((x) => x.id === previous)!);
    const value = this.state.joins.find((x) => x.id === id);
    if (!value) throw new ClassFlowError('NotFound', uiText.text_5c619550e9eb);
    if (value.userId !== this.actor.id)
      throw new ClassFlowError('Forbidden', uiText.text_150ffec13b8f);
    if (value.status !== 'Pending') throw new ClassFlowError('Conflict', uiText.text_66cdfc824858);
    value.status = 'Cancelled';
    this.recorded(operation, 'cancel-join', id);
    return structuredClone(value);
  }
  async reviewJoin(id: string, accept: boolean, reason: string, operation: string) {
    const previous = this.replay(operation, 'review-join');
    if (previous) return structuredClone(this.state.joins.find((x) => x.id === previous)!);
    const value = this.state.joins.find((x) => x.id === id);
    if (!value) throw new ClassFlowError('NotFound', uiText.text_5c619550e9eb);
    const cls = this.class(value.classId);
    requireClassManager(cls, this.actor.id);
    if (value.status !== 'Pending') throw new ClassFlowError('Conflict', uiText.text_485ceae81ed2);
    if (accept) this.addLearner(cls, value.userId, value.name);
    value.status = accept ? 'Approved' : 'Rejected';
    value.reason = reason;
    if (accept)
      this.state.invitations
        .filter((x) => x.classId === cls.id && x.userId === value.userId && x.status === 'Pending')
        .forEach((x) => (x.status = 'Accepted'));
    this.recorded(operation, 'review-join', id);
    return structuredClone(value);
  }
  async updateMember(
    id: string,
    memberId: string,
    localName: string,
    note: string,
    version: number,
  ) {
    const cls = this.class(id);
    requireClassManager(cls, this.actor.id);
    requireVersion(cls.version, version);
    const member = cls.members.find((x) => x.id === memberId);
    if (!member) throw new ClassFlowError('NotFound', uiText.text_114007a1ec32);
    member.localName = localName;
    member.note = note;
    cls.version++;
    this.changed();
    return structuredClone(member);
  }
  async endMembership(id: string, memberId: string, reason: string, operation: string) {
    const previous = this.replay(operation, 'end-member');
    const cls = this.class(id);
    if (previous) return structuredClone(cls.members.find((x) => x.id === previous)!);
    const member = cls.members.find((x) => x.id === memberId);
    if (!member) throw new ClassFlowError('NotFound', uiText.text_114007a1ec32);
    if (this.actor.id !== member.userId) requireClassManager(cls, this.actor.id);
    if (member.userId === cls.managerUserId)
      throw new ClassFlowError('Forbidden', uiText.text_1fd86a67ae63);
    if (!reason.trim()) throw new ClassFlowError('Validation', uiText.text_f77fa626cc9e);
    member.status = this.actor.id === member.userId ? 'Left' : 'Removed';
    cls.version++;
    this.recorded(operation, 'end-member', member.id);
    return structuredClone(member);
  }
  async archive(id: string, version: number, reason: string, operation: string) {
    const previous = this.replay(operation, 'archive');
    if (previous) return structuredClone(this.class(previous));
    const value = this.class(id);
    requireClassManager(value, this.actor.id);
    requireVersion(value.version, version);
    if (!reason.trim()) throw new ClassFlowError('Validation', uiText.text_8abff118d600);
    value.status = 'Archived';
    value.version++;
    this.state.invitations
      .filter((x) => x.classId === id && x.status === 'Pending')
      .forEach((x) => (x.status = 'Revoked'));
    this.state.joins
      .filter((x) => x.classId === id && x.status === 'Pending')
      .forEach((x) => (x.status = 'Cancelled'));
    this.recorded(operation, 'archive', id);
    return structuredClone(value);
  }
}
