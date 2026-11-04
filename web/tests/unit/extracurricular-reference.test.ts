import { describe, expect, it } from 'vitest';
import {
  PreviewClassService,
  samplePreviewState,
  sampleClassDraft,
  previewAccount,
} from '@/features/extracurricular/preview-service';
import {
  classPermissions,
  emptyClassDraft,
  validateClassDraft,
} from '@/features/extracurricular/model';
import {
  lifecycleContractDependency,
  requireLifecycleContract,
} from '@/features/extracurricular/service';
const now = () => '2026-11-02T07:12:00Z';
function service(state = samplePreviewState(), actor = { ...previewAccount, reviewer: false }) {
  return new PreviewClassService(actor, state, () => {}, now);
}
describe('independent class display domain and explicit preview adapter', () => {
  it('accepts a personal account without any organization or Student-role field', async () => {
    const api = service(),
      draft = await api.saveDraft({ ...sampleClassDraft, teacherUserId: '' });
    expect(draft.draft.managerUserId).toBe(previewAccount.id);
    const receipt = await api.submit(draft.id, draft.version, 'submit-personal');
    expect(receipt.status).toBe('Submitted');
    expect(receipt.classId).toBeUndefined();
  });
  it('recognizes the newly available lifecycle boundary without invoking the preview adapter', () => {
    expect(lifecycleContractDependency.available).toBe(true);
    expect(requireLifecycleContract().existingPaths).toContain('/api/v1/personal-class-requests');
  });
  it('normalizes Persian capacity and keeps teacher optional', () => {
    expect(
      validateClassDraft({ ...sampleClassDraft, capacity: '۲۰', teacherUserId: '' }, 'review'),
    ).toEqual({});
    expect(emptyClassDraft('personal').managerUserId).toBe('personal');
  });
  it('rejects incomplete requests and does not create classes', async () => {
    const api = service(),
      before = (await api.listClasses()).length;
    const value = await api.saveDraft(emptyClassDraft(previewAccount.id));
    await expect(api.submit(value.id, value.version, 'invalid')).rejects.toMatchObject({
      code: 'Validation',
    });
    expect((await api.listClasses()).length).toBe(before);
  });
  it('returns the same request on a repeated submit operation', async () => {
    const api = service(),
      draft = await api.saveDraft(sampleClassDraft);
    const first = await api.submit(draft.id, draft.version, 'stable-submit');
    const second = await api.submit(draft.id, draft.version, 'stable-submit');
    expect(second).toEqual(first);
  });
  it('requires a reviewer and a version for approval', async () => {
    const api = service();
    await expect(
      api.decide('request-story', 1, 'Approved', '', previewAccount.id, 'x'),
    ).rejects.toMatchObject({ code: 'Forbidden' });
    const owner = service(samplePreviewState(), { ...previewAccount, reviewer: true });
    await expect(
      owner.decide('request-story', 0, 'Approved', '', previewAccount.id, 'y'),
    ).rejects.toMatchObject({ code: 'Conflict' });
  });
  it('keeps the reviewed teacher choice separate from the proposal and permits one accepted manager to teach', async () => {
    const api = service(samplePreviewState(), { ...previewAccount, reviewer: true });
    const approved = await api.decide(
      'request-story',
      1,
      'Approved',
      '',
      previewAccount.id,
      'teacher-review',
      previewAccount.id,
    );
    const cls = await api.getClass(approved.classId!);
    expect(cls.teacherUserId).toBe(previewAccount.id);
    expect(approved.draft.teacherUserId).toBe('');
    expect(cls.members[0].roles).toEqual(['Manager', 'Teacher']);
    expect(classPermissions(cls, previewAccount.id).canTeach).toBe(false);
    const setup = await api.retrySetup(cls.id, cls.version, 'teacher-setup');
    const active = await api.start(cls.id, setup.version, 'teacher-start');
    expect(classPermissions(active, previewAccount.id).canTeach).toBe(true);
  });
  it('accepts an explicitly empty final teacher and never adds a different proposal as a member', async () => {
    const initial = samplePreviewState();
    initial.requests[0].draft.teacherUserId = 'proposed-teacher';
    const api = service(initial, { ...previewAccount, reviewer: true });
    const approved = await api.decide(
      'request-story',
      1,
      'Approved',
      '',
      previewAccount.id,
      'teacher-empty',
      '',
    );
    const cls = await api.getClass(approved.classId!);
    expect(cls.teacherUserId).toBeUndefined();
    expect(cls.members).toHaveLength(1);
    expect(cls.members[0].roles).toEqual(['Manager']);
    expect(approved.draft.teacherUserId).toBe('proposed-teacher');
  });
  it('retains the request id and reason across revision and resubmission', async () => {
    const owner = service(samplePreviewState(), { ...previewAccount, reviewer: true });
    const revision = await owner.decide(
      'request-story',
      1,
      'NeedsRevision',
      'شرایط پذیرش را روشن‌تر کنید',
      previewAccount.id,
      'revision',
    );
    const applicant = service(owner.snapshot());
    const saved = await applicant.saveDraft(
      { ...revision.draft, admission: 'قواعد و سطح مشخص برای همه اعضا' },
      revision.id,
    );
    const submitted = await applicant.submit(saved.id, saved.version, 'resubmit');
    expect(submitted.id).toBe(revision.id);
    expect(submitted.history.map((x) => x.status)).toContain('NeedsRevision');
  });
  it('does not grant a requester membership when the reviewer assigns another manager', async () => {
    const owner = service(samplePreviewState(), { ...previewAccount, reviewer: true });
    const result = await owner.decide(
      'request-story',
      1,
      'Approved',
      'جایگزین مورد بررسی',
      'other-manager',
      'approve',
    );
    const cls = owner.snapshot().classes.find((c) => c.id === result.classId)!;
    expect(classPermissions(cls, previewAccount.id).canRead).toBe(false);
    expect(cls.managerAccepted).toBe(false);
  });
  it('creates only one class, group and channel for one approval command', async () => {
    const owner = service(samplePreviewState(), { ...previewAccount, reviewer: true });
    const one = await owner.decide(
      'request-story',
      1,
      'Approved',
      '',
      previewAccount.id,
      'approve-once',
    );
    await owner.decide('request-story', 1, 'Approved', '', previewAccount.id, 'approve-once');
    const classes = owner.snapshot().classes.filter((c) => c.requestId === 'request-story');
    expect(classes).toHaveLength(1);
    expect(classes[0].id).toBe(one.classId);
    expect(classes[0].group.id).not.toBe(classes[0].channel.id);
  });
  it('retries partial provisioning with the existing identifiers and optional teacher', async () => {
    const state = samplePreviewState(),
      cls = state.classes[0];
    cls.status = 'ProvisioningFailed';
    cls.channel.ready = false;
    const api = service(state),
      before = structuredClone(cls);
    const result = await api.retrySetup(cls.id, cls.version, 'same-setup');
    expect(result.id).toBe(before.id);
    expect(result.group.id).toBe(before.group.id);
    expect(result.channel.id).toBe(before.channel.id);
    expect(result.status).toBe('Setup');
    expect(result.teacherUserId).toBeUndefined();
    const started = await api.start(result.id, result.version, 'start');
    expect(started.status).toBe('Active');
  });
  it('does not start while a channel is incomplete', async () => {
    const state = samplePreviewState();
    state.classes[0].status = 'Setup';
    state.classes[0].channel.ready = false;
    await expect(service(state).start('class-story', 1, 'start')).rejects.toMatchObject({
      code: 'Conflict',
    });
  });
  it('requires replacement management acceptance before starting', async () => {
    const state = samplePreviewState(),
      cls = state.classes[0];
    cls.status = 'Setup';
    cls.managerAccepted = false;
    const api = service(state);
    await expect(api.start(cls.id, 1, 'start')).rejects.toMatchObject({ code: 'Forbidden' });
    const accepted = await api.acceptManagement(cls.id, 1, 'accept');
    expect((await api.start(cls.id, accepted.version, 'start-after')).status).toBe('Active');
  });
  it('keeps a pending join separate from access', async () => {
    const state = samplePreviewState();
    state.classes[0].members = state.classes[0].members.filter(
      (m) => m.userId !== previewAccount.id,
    );
    const api = service(state),
      request = await api.join('class-story', 'join');
    expect(request.status).toBe('Pending');
    expect(classPermissions(api.snapshot().classes[0], previewAccount.id).canRead).toBe(false);
  });
  it('coalesces invitation and join acceptance to one local membership', async () => {
    const state = samplePreviewState(),
      cls = state.classes[0];
    cls.managerUserId = 'different-manager';
    cls.members = cls.members.filter((m) => m.userId !== previewAccount.id);
    state.joins.push({
      id: 'join-sara',
      classId: cls.id,
      userId: previewAccount.id,
      name: 'سارا',
      status: 'Pending',
    });
    const api = service(state);
    await api.respondInvitation('invitation-story', true, 'accept-invite');
    const snapshot = api.snapshot();
    expect(snapshot.classes[0].members.filter((m) => m.userId === previewAccount.id)).toHaveLength(
      1,
    );
    expect(snapshot.joins.find((j) => j.id === 'join-sara')?.status).toBe('Approved');
  });
  it('rejects expired invitations without granting access', async () => {
    const state = samplePreviewState();
    state.invitations[0].expiresAt = '2026-10-01T00:00:00Z';
    await expect(
      service(state).respondInvitation('invitation-story', true, 'expired'),
    ).rejects.toMatchObject({ code: 'Expired' });
  });
  it('accepts only one of two concurrent final-capacity requests in the local model', async () => {
    const state = samplePreviewState();
    state.classes[0].capacity =
      state.classes[0].members.filter((m) => m.roles.includes('Learner')).length + 1;
    const api = service(state),
      results = await Promise.allSettled([
        api.reviewJoin('join-maryam', true, '', 'accept-a'),
        api.reviewJoin('join-ali', true, '', 'accept-b'),
      ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      api
        .snapshot()
        .classes[0].members.filter((m) => m.roles.includes('Learner') && m.status === 'Active'),
    ).toHaveLength(state.classes[0].capacity);
  });
  it('changes local member information without changing central identity', async () => {
    const api = service();
    const member = await api.updateMember(
      'class-story',
      'member-0',
      'نام داخل کلاس',
      'یادداشت آموزشی',
      1,
    );
    expect(member.name).toBe(
      samplePreviewState().classes[0].members.find((m) => m.id === 'member-0')!.name,
    );
    expect(member.localName).toBe('نام داخل کلاس');
  });
  it('revokes local read and write permissions after ending membership', async () => {
    const api = service();
    await api.endMembership('class-story', 'member-0', 'پایان عضویت', 'end');
    expect(classPermissions(api.snapshot().classes[0], 'preview-member-0')).toMatchObject({
      canRead: false,
      canWrite: false,
      canTeach: false,
    });
  });
  it('prevents the responsible manager from leaving an active class', async () => {
    await expect(
      service().endMembership('class-story', 'member-sara', 'خروج', 'leave'),
    ).rejects.toMatchObject({ code: 'Forbidden' });
  });
  it('archives the local class and ends open invitations and join requests', async () => {
    const api = service();
    await api.archive('class-story', 1, 'پایان دوره', 'archive');
    const snapshot = api.snapshot();
    expect(snapshot.classes[0].status).toBe('Archived');
    expect(snapshot.invitations[0].status).toBe('Revoked');
    expect(snapshot.joins.every((j) => j.status !== 'Pending')).toBe(true);
    expect(classPermissions(snapshot.classes[0], previewAccount.id).canWrite).toBe(false);
  });
});
