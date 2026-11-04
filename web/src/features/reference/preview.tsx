'use client';
import '@/features/reference/bundles/features-reference-preview';

import * as uiText from '@/content/fa';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReferenceScreen, referenceBlueprint, type ReferenceControl } from './screen';
import {
  PreviewClassService,
  samplePreviewState,
  sampleClassDraft,
  previewAccount,
} from '@/features/extracurricular/preview-service';
import {
  validateClassDraft,
  normalizeClassNumber,
  requestLabels,
  activeClassMember,
  type ClassDraft,
  type PreviewState,
} from '@/features/extracurricular/model';

type PreviewNode = Exclude<ReturnType<typeof referenceBlueprint>['tree'], string>;
function nodesOf(node: PreviewNode | string): PreviewNode[] {
  return typeof node === 'string' ? [] : [node, ...node.children.flatMap(nodesOf)];
}
function nodeText(node: PreviewNode | string): string {
  return typeof node === 'string' ? node : node.children.map(nodeText).join('');
}

const navigation: Record<string, string> = {
  آموزشگاه: 'MK-04',
  فوق‌برنامه: 'MK-11',
  دستیار: 'MK-38',
  پیام‌ها: 'MK-35',
  پروفایل: 'MK-47',
};
const fieldNames: Record<string, keyof ClassDraft> = {
  [uiText.text_e5199f5b6d80]: 'title',
  [uiText.text_c64ac820d916]: 'description',
  موضوع: 'subject',
  [uiText.text_e3e34f26cc91]: 'level',
  ظرفیت: 'capacity',
  [uiText.text_a15babf46309]: 'admission',
  [uiText.text_8b478db62f28]: 'title',
};
const inviteTargets = [
  { id: 'preview-invited-account', name: uiText.text_9c3669598c7a, username: 'nazanin.m' },
  { id: 'preview-invite-maryam', name: uiText.text_8672a32afbd3, username: 'maryam.r' },
  { id: 'preview-invite-amir', name: uiText.text_fd074e910b1a, username: 'amir.r' },
];
function seed(id: string, scenario = ''): PreviewState {
  const state = samplePreviewState(),
    cls = state.classes[0];
  if (['MK-20', 'MK-21', 'MK-22'].includes(id)) {
    cls.status = id === 'MK-20' ? 'Provisioning' : id === 'MK-21' ? 'ProvisioningFailed' : 'Setup';
    cls.channel.ready = id === 'MK-22';
  }
  if (id === 'MK-25') cls.status = 'Archived';
  if (['MK-27', 'MK-28'].includes(id)) {
    cls.managerUserId = 'preview-manager';
    cls.members = cls.members.filter((x) => x.userId !== previewAccount.id);
    cls.members.unshift({
      id: 'manager-other',
      userId: 'preview-manager',
      name: uiText.text_8147a634c05f,
      localName: '',
      note: '',
      roles: ['Manager'],
      status: 'Active',
    });
  }
  if (['MK-16', 'MK-13', 'MK-14', 'MK-15', 'MK-58'].includes(id)) {
    state.requests[0].status = 'Draft';
    state.requests[0].history = [];
  }
  if (id === 'MK-18') {
    state.requests[0].status = 'NeedsRevision';
    state.requests[0].reason = uiText.text_41d9e24090ab;
  }
  if (scenario === 'invitation-expired') state.invitations[0].expiresAt = '2026-10-01T07:00:00Z';
  if (scenario === 'invitation-revoked') state.invitations[0].status = 'Revoked';
  if (scenario === 'capacity-full')
    cls.capacity = cls.members.filter((x) => x.roles.includes('Learner')).length;
  if (scenario === 'manager-alternative') {
    cls.managerUserId = 'preview-alternate';
    cls.managerAccepted = false;
    cls.members = cls.members.filter((x) => x.userId !== previewAccount.id);
    cls.members.push({
      id: 'alternate-member',
      userId: 'preview-alternate',
      name: uiText.text_77f943ba162c,
      localName: '',
      note: '',
      roles: ['Manager'],
      status: 'Active',
    });
    cls.status = 'Setup';
    cls.channel.ready = true;
  }
  if (scenario === 'membership-rejected') state.joins[0].status = 'Rejected';
  if (scenario === 'membership-cancelled') state.joins[0].status = 'Cancelled';
  if (id === 'MK-12' || id === 'MK-19') {
    const base = structuredClone(state.requests[0]);
    const additional = [
      ['request-book', uiText.text_d4eb42ba5864, id === 'MK-12' ? 'UnderReview' : 'Submitted'],
      ['request-english', uiText.text_85da2a98530c, id === 'MK-12' ? 'NeedsRevision' : 'Submitted'],
      ['request-photo', uiText.text_36da0153744f, id === 'MK-12' ? 'Draft' : 'Submitted'],
    ];
    state.requests = [
      ...(id === 'MK-19' ? [base] : []),
      ...additional.map(([id, title, status]) => ({
        ...structuredClone(base),
        id,
        status: status as typeof base.status,
        draft: { ...base.draft, title },
      })),
    ];
  }
  if (scenario === 'rejected' || scenario === 'cancelled')
    state.requests[0].status = scenario === 'rejected' ? 'Rejected' : 'Cancelled';
  return state;
}
export function ReferencePreview({ id }: { id: string }) {
  const router = useRouter(),
    blueprint = referenceBlueprint(id);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<ClassDraft>({ ...sampleClassDraft });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<{
    title: string;
    body?: ReactNode;
    action?: () => Promise<void> | void;
    confirm?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [state, setState] = useState(() => seed(id));
  const [selectedRequestId, setSelectedRequestId] = useState(''),
    [selectedMemberId, setSelectedMemberId] = useState('');
  const [newFormation, setNewFormation] = useState(false);
  const [scenario, setScenario] = useState(''),
    [actor, setActor] = useState({ ...previewAccount, reviewer: true });
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const persist = useRef<(next: PreviewState) => void>(() => {});
  const service = useRef<PreviewClassService | null>(null);
  const operation = useRef(crypto.randomUUID());
  const navigate = (view: string) => router.push('/preview/reference/' + view);
  useEffect(() => {
    const variant = new URL(location.href).searchParams.get('scenario') ?? '';
    setScenario(variant);
    let initial = seed(id, variant),
      initialActor = { ...previewAccount, reviewer: true };
    try {
      setSelectedRequestId(sessionStorage.getItem('makan-reference-request') ?? '');
      setSelectedMemberId(sessionStorage.getItem('makan-reference-member') ?? '');
      setNewFormation(sessionStorage.getItem('makan-reference-new-request') === 'true');
      const saved = sessionStorage.getItem('makan-reference-preview-v1');
      if (saved && !variant) {
        const data = JSON.parse(saved);
        if (data.version === 1) {
          initial = data.state;
          setDraft(data.draft ?? sampleClassDraft);
          initialActor = data.actor ?? initialActor;
        }
      }
    } catch {}
    try {
      const selected =
        sessionStorage.getItem('makan-reference-request') ?? initial.requests[0]?.id ?? '';
      const raw = JSON.parse(
        sessionStorage.getItem(
          'makan-reference-values:' + id + ':' + (id === 'MK-19' ? selected : ''),
        ) ?? 'null',
      );
      if (
        raw &&
        typeof raw === 'object' &&
        Object.values(raw).every((v) => typeof v === 'string' || typeof v === 'boolean')
      )
        setValues(raw);
    } catch {}
    if (id === 'MK-58') setDraft({ ...sampleClassDraft, description: '' });
    if (id === 'MK-03')
      setValues({ [blueprint.controls.find((c) => c.kind === 'otp')!.key]: '4719' });
    const update = (next: PreviewState) => {
      setState(next);
      try {
        sessionStorage.setItem(
          'makan-reference-preview-v1',
          JSON.stringify({
            version: 1,
            state: next,
            draft: draftRef.current,
            actor: actorRef.current,
          }),
        );
      } catch {}
    };
    persist.current = update;
    actorRef.current = initialActor;
    setActor(initialActor);
    service.current = new PreviewClassService(initialActor, initial, update, () =>
      new Date('2026-11-02T07:12:00Z').toISOString(),
    );
    setState(initial);
    setReady(true);
  }, []); // A route visit opens an explicit synthetic scenario; real sessions never use this store.
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        'makan-reference-preview-v1',
        JSON.stringify({ version: 1, state: service.current?.snapshot() ?? state, draft, actor }),
      );
    } catch {}
  }, [draft, state, ready, actor]);
  const fieldControls = blueprint.controls.filter((c) => c.kind === 'field');
  const wizard = ['MK-13', 'MK-14', 'MK-15', 'MK-16', 'MK-58'].includes(id);
  const mappedValues = { ...values };
  if (wizard)
    for (const control of fieldControls) {
      let field = fieldNames[control.label];
      if (id === 'MK-14')
        field =
          fieldControls.indexOf(control) === 0
            ? 'level'
            : fieldControls.indexOf(control) === 1
              ? 'capacity'
              : 'admission';
      if (field) mappedValues[control.key] = String(draft[field]);
    }
  const sourceCount = blueprint.controls.filter(
    (c) => c.kind === 'checkCircle' && Boolean(values[c.key] ?? c.checked),
  ).length;
  const inviteTarget =
    values['invite-target'] === undefined
      ? inviteTargets[0]
      : inviteTargets.find((t) => t.id === values['invite-target']);
  const inviteSearch = id === 'MK-26' ? String(values[fieldControls[0]?.key] ?? '') : '';
  const request = state.requests.find((r) => r.id === selectedRequestId) ?? state.requests[0],
    currentClass = state.classes.find((c) => c.id === request.classId) ?? state.classes[0];
  const member =
    currentClass.members.find((m) => m.id === selectedMemberId) ??
    currentClass.members.find((m) => m.roles.includes('Learner')) ??
    currentClass.members[0];
  const changed = Object.keys(state.operations).length > 0;
  const previewManager =
    currentClass.managerUserId === actor.id &&
    currentClass.managerAccepted &&
    currentClass.status === 'Active';
  const memberSheetOpen =
    values['member-end-open'] === undefined ? !selectedMemberId : !!values['member-end-open'];
  useEffect(() => {
    if (!ready || wizard || id === 'MK-31') return;
    try {
      sessionStorage.setItem(
        'makan-reference-values:' + id + ':' + (id === 'MK-19' ? request.id : ''),
        JSON.stringify(values),
      );
    } catch {}
  }, [id, ready, wizard, request.id, values]);
  if (id === 'MK-14')
    blueprint.controls
      .filter((c) => c.kind === 'check')
      .forEach(
        (c, i) => (mappedValues[c.key] = i === 0 ? draft.allowInvites : draft.allowRequests),
      );
  if (id === 'MK-31' && (selectedMemberId || changed)) {
    const defaults = [
      member.localName || member.name,
      member.roles.includes('Manager')
        ? uiText.text_8147a634c05f
        : member.roles.includes('Teacher')
          ? uiText.text_2000c11f322c
          : uiText.text_5cc696912f59,
      member.note,
      '',
    ];
    fieldControls.forEach((c, i) => {
      mappedValues[c.key] = values[c.key] ?? defaults[i] ?? '';
    });
  }
  if (id === 'MK-19') {
    const teacher = fieldControls.find((c) => c.label === uiText.text_b7a54e700d6f);
    if (teacher)
      mappedValues[teacher.key] =
        values[teacher.key] ??
        (draft.teacherUserId === previewAccount.id
          ? uiText.text_1bcd4348116c
          : draft.teacherUserId
            ? uiText.text_cee30389ab2f
            : teacher.initial);
  }
  function chooseRequest(value: typeof request) {
    setSelectedRequestId(value.id);
    setDraft(value.draft);
    setNewFormation(false);
    try {
      sessionStorage.setItem('makan-reference-request', value.id);
      sessionStorage.setItem('makan-reference-new-request', 'false');
    } catch {}
    navigate(
      value.status === 'NeedsRevision' ? 'MK-18' : value.status === 'Draft' ? 'MK-13' : 'MK-17',
    );
  }
  function chooseMember(value: typeof member) {
    setSelectedMemberId(value.id);
    try {
      sessionStorage.setItem('makan-reference-member', value.id);
    } catch {}
    navigate('MK-31');
  }
  function selectReviewRequest(value: typeof request) {
    let restored: Record<string, string | boolean> = {};
    try {
      sessionStorage.setItem('makan-reference-values:MK-19:' + request.id, JSON.stringify(values));
      const saved = JSON.parse(
        sessionStorage.getItem('makan-reference-values:MK-19:' + value.id) ?? 'null',
      );
      if (
        saved &&
        typeof saved === 'object' &&
        Object.values(saved).every((v) => typeof v === 'string' || typeof v === 'boolean')
      )
        restored = saved;
      sessionStorage.setItem('makan-reference-request', value.id);
    } catch {}
    const teacher = fieldControls.find((c) => c.label === uiText.text_b7a54e700d6f);
    const manager = fieldControls.find((c) => c.label === uiText.text_845d1ff8c616);
    const teacherChoice = String(restored[teacher?.key ?? ''] ?? '');
    setSelectedRequestId(value.id);
    setValues(restored);
    setErrors({});
    setDraft({
      ...value.draft,
      managerUserId: String(restored[manager?.key ?? ''] ?? '').startsWith(uiText.text_5b9f9420f7bb)
        ? 'preview-alternate'
        : value.draft.managerUserId,
      teacherUserId: teacherChoice.startsWith(uiText.text_d0dbac5ab02b)
        ? previewAccount.id
        : teacherChoice && teacherChoice === teacher?.initial
          ? ''
          : value.draft.teacherUserId,
    });
  }
  const nodes = nodesOf(blueprint.tree),
    hidden = new Set<string>(),
    classes: Record<string, string> = {};
  const query = String(
    values[blueprint.controls.find((c) => c.kind === 'search')?.key ?? ''] ?? '',
  ).trim();
  const filter = String(values['selected-filter'] ?? uiText.text_15270886eadd);
  const candidates = nodes.filter((n) => {
    const c = n.attrs.className ?? '';
    if (['MK-35', 'MK-51'].includes(id)) return c.split(' ').includes('chat-row');
    if (['MK-30', 'MK-39', 'MK-57'].includes(id)) return c === 'row';
    if (id === 'MK-41' || id === 'MK-12') return c === 'card';
    if (['MK-11', 'MK-50', 'MK-53'].includes(id)) return c === 'card hero';
    if (id === 'MK-19') return c.split(' ').includes('q-row');
    if (id === 'MK-56')
      return n.tag === 'tr' && n.children.some((c) => typeof c !== 'string' && c.tag === 'td');
    return false;
  });
  for (const n of candidates) {
    const label = nodeText(n);
    let match = !query || label.includes(query);
    if (['MK-35', 'MK-51'].includes(id)) {
      const channel = label.includes(uiText.text_2db356b462dd),
        group = /کارگاه|ریاضی|باشگاه/.test(label) && !channel;
      match &&=
        filter === uiText.text_15270886eadd ||
        (filter === uiText.text_b3e662eb0f81
          ? nodesOf(n).some((x) => (x.attrs.className ?? '').includes('count'))
          : filter === uiText.text_197ebc70e3d9
            ? group
            : channel);
    }
    if (['MK-30', 'MK-57', 'MK-56'].includes(id))
      match &&=
        filter === uiText.text_15270886eadd ||
        (filter === uiText.text_2d6bdf75139c
          ? label.includes(uiText.text_e165f50197d6)
          : label.includes(uiText.text_5cc696912f59));
    if (['MK-11', 'MK-50', 'MK-53'].includes(id)) match &&= filter !== uiText.text_740e6f513649;
    if (id === 'MK-12')
      match &&=
        filter === uiText.text_15270886eadd ||
        (filter === uiText.text_950b03b98425
          ? label.includes(uiText.text_f71cd91dad22)
          : label.includes(filter));
    if (id === 'MK-41')
      match &&=
        filter === uiText.text_15270886eadd ||
        (filter === uiText.text_376e9c9561e2
          ? label.includes(uiText.text_386f881f20d5)
          : label.includes(uiText.text_97d58681dead));
    if (id === 'MK-39')
      match &&=
        String(values['source-scope'] ?? uiText.text_8957887c2b2f) === uiText.text_8957887c2b2f;
    if (!match) hidden.add(n.key);
  }
  for (const c of blueprint.controls) {
    const parent = nodes.find((n) =>
      n.children.some((child) => typeof child !== 'string' && child.key === c.key),
    );
    if (
      parent?.attrs.className === 'seg' ||
      (candidates.length &&
        [
          uiText.text_15270886eadd,
          uiText.text_2d6bdf75139c,
          uiText.text_856c3fe1b88b,
          uiText.text_b3e662eb0f81,
          uiText.text_197ebc70e3d9,
          uiText.text_028b3c5809be,
          uiText.text_376e9c9561e2,
          uiText.text_68bfe264e2cf,
          uiText.text_740e6f513649,
          uiText.text_512b7d535f79,
          uiText.text_950b03b98425,
          uiText.text_410c47c7f8b7,
          uiText.text_952c0b87e7ca,
        ].includes(c.label))
    )
      classes[c.key] = c.classes.replace(/\bon\b/g, '') + (filter === c.label ? ' on' : '');
    if (c.kind === 'quizOption')
      classes[c.key] =
        c.classes.replace(/\bselected\b/g, '') +
        ((values['quiz-choice'] ??
          blueprint.controls.find((c) => c.kind === 'quizOption' && c.checked)?.key) === c.key
          ? ' selected'
          : '');
    if (c.classes.includes('date-cell') && values['date-selection'])
      classes[c.key] =
        c.classes.replace(/\bsel\b/g, '') + (values['date-selection'] === c.key ? ' sel' : '');
  }
  const noResults = candidates.length > 0 && candidates.every((n) => hidden.has(n.key));
  function replaceScenario(next: PreviewState, nextActor = actorRef.current) {
    actorRef.current = nextActor;
    setActor(nextActor);
    service.current = new PreviewClassService(nextActor, next, persist.current, () =>
      new Date('2026-11-02T07:12:00Z').toISOString(),
    );
    persist.current(next);
  }
  async function run(action: () => Promise<void> | void) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    setPanel(null);
    try {
      await action();
      operation.current = crypto.randomUUID();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : uiText.text_df07a7e48e65);
    } finally {
      setBusy(false);
    }
  }
  function confirm(title: string, action: () => Promise<void> | void, body?: ReactNode) {
    setPanel({ title, body, action, confirm: uiText.text_29a84b4a6887 });
  }
  function change(control: ReferenceControl, value: string | boolean) {
    setValues((old) => ({ ...old, [control.key]: value }));
    setErrors((old) => ({ ...old, [control.key]: '' }));
    if (id === 'MK-26' && control.label === uiText.text_58370e07ac00)
      setValues((old) => ({ ...old, 'invite-target': '' }));
    if (id === 'MK-26' && control.kind === 'checkCircle')
      setValues((old) => ({ ...old, 'invite-target': value ? inviteTargets[0].id : '' }));
    if (wizard && control.kind === 'field') {
      let field = fieldNames[control.label];
      if (id === 'MK-14')
        field =
          fieldControls.indexOf(control) === 0
            ? 'level'
            : fieldControls.indexOf(control) === 1
              ? 'capacity'
              : 'admission';
      if (field) setDraft((old) => ({ ...old, [field]: String(value).replace(/ نفر$/, '') }));
    }
    if (id === 'MK-15' && control.kind === 'radio') {
      setValues((old) => ({
        ...old,
        ...Object.fromEntries(
          blueprint.controls
            .filter((c) => c.kind === 'radio')
            .map((c) => [c.key, c.key === control.key]),
        ),
      }));
      setDraft((old) => ({
        ...old,
        teacherUserId: control.label.includes(uiText.text_88cbbb8ed56e) ? '' : 'preview-teacher',
      }));
    }
    if (id === 'MK-16' && control.kind === 'check')
      setDraft((old) => ({ ...old, acceptedRules: !!value }));
    if (id === 'MK-14' && control.kind === 'check') {
      const first = blueprint.controls.find((c) => c.kind === 'check')!;
      setDraft((old) => ({
        ...old,
        [first.key === control.key ? 'allowInvites' : 'allowRequests']: !!value,
      }));
    }
    if (id === 'MK-19' && control.label === uiText.text_845d1ff8c616)
      setDraft((old) => ({
        ...old,
        managerUserId: String(value).startsWith(uiText.text_5b9f9420f7bb)
          ? 'preview-alternate'
          : previewAccount.id,
      }));
    if (id === 'MK-19' && control.label === uiText.text_b7a54e700d6f)
      setDraft((old) => ({
        ...old,
        teacherUserId: String(value).startsWith(uiText.text_d0dbac5ab02b)
          ? previewAccount.id
          : value === uiText.text_cee30389ab2f
            ? request.draft.teacherUserId || 'preview-teacher'
            : '',
      }));
    if (control.kind === 'radio')
      setValues((old) => ({
        ...old,
        ...Object.fromEntries(
          blueprint.controls
            .filter((c) => c.kind === 'radio')
            .map((c) => [c.key, c.key === control.key]),
        ),
      }));
    if (id === 'MK-46' && control.kind === 'radio') {
      const parent = nodes.find((n) =>
        n.children.some((c) => typeof c !== 'string' && c.key === control.key),
      );
      if (parent) setValues((old) => ({ ...old, 'quiz-choice': parent.key }));
    }
  }
  function nextStep(step: 'details' | 'audience' | 'management', next: string) {
    const issues = validateClassDraft(draft, step);
    const controls = Object.fromEntries(
      fieldControls.map((c) => [c.key, issues[fieldNames[c.label]] ?? '']),
    );
    if (id === 'MK-14')
      fieldControls.forEach(
        (c, i) =>
          (controls[c.key] = issues[(['level', 'capacity', 'admission'] as const)[i]] ?? ''),
      );
    setErrors(controls);
    if (Object.keys(issues).length) {
      setNotice(uiText.text_b5e5d5a53df4);
      return;
    }
    navigate(next);
  }
  async function submitDraft() {
    const issues = validateClassDraft(draft, 'review');
    if (Object.keys(issues).length) {
      setNotice(Object.values(issues)[0] ?? uiText.text_496693194265);
      return;
    }
    const existing = newFormation
      ? undefined
      : state.requests.find(
          (x) => x.id === request.id && ['Draft', 'NeedsRevision'].includes(x.status),
        );
    const saved = await service.current!.saveDraft(draft, existing?.id);
    await service.current!.submit(saved.id, saved.version, operation.current);
    setSelectedRequestId(saved.id);
    setNewFormation(false);
    try {
      sessionStorage.setItem('makan-reference-request', saved.id);
      sessionStorage.setItem('makan-reference-new-request', 'false');
    } catch {}
    navigate('MK-17');
  }
  function action(control: ReferenceControl) {
    const label = control.label;
    if (id === 'MK-19' && control.classes.includes('q-row')) {
      const item = state.requests.find((r) => label.includes(r.draft.title));
      if (item) selectReviewRequest(item);
      return;
    }
    if (
      id === 'MK-19' &&
      control.classes.includes('navitem') &&
      label.includes(uiText.text_908693ff0cba)
    )
      return;
    if (control.kind === 'calendar') {
      setPanel({
        title: uiText.text_2903d08bf9ed,
        body: (
          <label>
            {uiText.text_52707c485336}
            <input
              type="date"
              aria-label={uiText.text_52707c485336}
              min="2026-11-03"
              defaultValue={String(values['invite-expires'] ?? '2026-11-09').slice(0, 10)}
              onChange={(event) => {
                if (!event.target.value) return;
                const expiry = event.target.value + 'T20:29:59Z';
                if (Date.parse(expiry) <= Date.parse('2026-11-02T07:12:00Z')) {
                  setNotice(uiText.text_74e03945b745);
                  return;
                }
                setValues((old) => ({
                  ...old,
                  'invite-expires': expiry,
                  'invite-expiry-label': new Intl.DateTimeFormat('fa-IR', {
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'Asia/Tehran',
                  }).format(new Date(expiry)),
                }));
                setPanel(null);
              }}
            />
          </label>
        ),
      });
      return;
    }
    if (label === uiText.text_5d287e2ca678) {
      const text = nodes.find((n) => n.attrs.className === 'ai-card');
      void navigator.clipboard.writeText(text ? nodeText(text) : '').then(
        () => setNotice(uiText.text_7306b3732b3f),
        () => setNotice(uiText.text_9aadf79d9911),
      );
      return;
    }
    if (label === uiText.text_a5397936e6a5 || label === uiText.text_b26114122a10) {
      setValues((old) => ({ ...old, 'answer-feedback': label }));
      setNotice(uiText.text_450ac63d84ba + label + uiText.text_78f643400081);
      return;
    }
    if (label === uiText.text_01eac8227680 || label === uiText.text_e85bd3d1815d) {
      setPanel({
        title: label,
        body: (
          <div className="mk-menu-actions">
            {label === uiText.text_01eac8227680 ? (
              <label className="field">
                {uiText.text_188f29c36f33}
                <input
                  type="file"
                  onChange={(event) => {
                    setValues((old) => ({
                      ...old,
                      'attachment-name': event.target.files?.[0]?.name ?? '',
                    }));
                    setNotice(uiText.text_656db61b9edb);
                    setPanel(null);
                  }}
                />
              </label>
            ) : (
              <>
                <p>{uiText.text_4d5f8ee3b0dd}</p>
                <Button
                  onClick={() => {
                    setValues((old) => ({ ...old, 'attachment-removed': true }));
                    setPanel(null);
                    setNotice(uiText.text_7fbb6bd07898);
                  }}
                >
                  {uiText.text_c2d9391c4882}
                </Button>
              </>
            )}
          </div>
        ),
      });
      return;
    }
    if (label.startsWith(uiText.text_3f5f607ce17d) && control.classes.includes('mk-inline-icon')) {
      chooseMember(currentClass.members.find((m) => label.includes(m.name)) ?? member);
      return;
    }
    if (
      ['MK-04', 'MK-07', 'MK-08', 'MK-09'].includes(id) &&
      [uiText.text_e7b1ccd0bda3, uiText.text_7c61d113156b, uiText.text_57a7edee4ab6].includes(label)
    ) {
      setPanel({
        title:
          label === uiText.text_57a7edee4ab6 ? uiText.text_b05e4b9892e2 : uiText.text_6d784fcb7c9a,
        body: (
          <div className="mk-menu-actions">
            <p>{uiText.text_b39af5968a34}</p>
            <Button
              onClick={() => {
                setPanel(null);
                navigate('MK-05');
              }}
            >
              {uiText.text_fda75c7fcbfd}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPanel(null);
                navigate('MK-06');
              }}
            >
              {uiText.text_1f55b6fe9e80}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (control.classes.includes('navitem')) {
      const name = Object.keys(navigation).find((n) => label.startsWith(n));
      if (name) {
        navigate(navigation[name]);
        return;
      }
    }
    if (control.kind === 'navigation') {
      const target = navigation[label];
      if (target) navigate(target);
      return;
    }
    if (control.kind === 'message') {
      navigate('MK-37');
      return;
    }
    if (label === uiText.common_back) {
      const back: Record<string, string> = {
        'MK-02': 'MK-01',
        'MK-03': 'MK-02',
        'MK-13': 'MK-12',
        'MK-14': 'MK-13',
        'MK-15': 'MK-14',
        'MK-16': 'MK-15',
        'MK-37': 'MK-36',
        'MK-39': 'MK-38',
        'MK-40': 'MK-38',
      };
      navigate(back[id] ?? 'MK-11');
      return;
    }
    if (label === uiText.text_739d6daf2013) {
      setPanel({
        title: uiText.text_0ea5b13c7e30,
        body: (
          <div className="mk-menu-actions">
            <p>
              {uiText.text_bb901d4e7cf8}
              {actor.name}
            </p>
            <Button
              onClick={() => {
                setNotice(uiText.text_9ecb99fc4c1c);
                setPanel(null);
              }}
            >
              {uiText.text_07caec0791ec}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPanel(null);
                navigate('MK-12');
              }}
            >
              {uiText.text_cf80869f96ed}
            </Button>
            {previewManager && (
              <Button
                variant="outline"
                onClick={() =>
                  confirm(
                    uiText.text_2927be7c5ee8,
                    async () => {
                      await service.current!.archive(
                        currentClass.id,
                        currentClass.version,
                        uiText.text_2fe2190d8013,
                        operation.current,
                      );
                      navigate('MK-25');
                    },
                    uiText.text_6e56c9cbe921,
                  )
                }
              >
                {uiText.text_2927be7c5ee8}
              </Button>
            )}
            {previewManager && (
              <Button
                variant="ghost"
                onClick={() => {
                  setPanel(null);
                  navigate('MK-55');
                }}
              >
                {uiText.text_fc54123421eb}
              </Button>
            )}
            {['Draft', 'Submitted', 'NeedsRevision'].includes(request.status) && (
              <Button
                variant="outline"
                onClick={() =>
                  confirm(uiText.text_80d8dab3abe6, async () => {
                    await service.current!.cancel(request.id, request.version, operation.current);
                    setNotice(uiText.text_e24ca11d2595);
                  })
                }
              >
                {uiText.text_80d8dab3abe6}
              </Button>
            )}
            {id === 'MK-20' && (
              <Button
                onClick={() => {
                  const next = service.current!.snapshot(),
                    cls = next.classes.find((c) => c.id === currentClass.id)!;
                  cls.status = 'ProvisioningFailed';
                  cls.version++;
                  replaceScenario(next);
                  setPanel(null);
                  navigate('MK-21');
                }}
              >
                {uiText.text_f9b69a2dc866}
              </Button>
            )}
            {['MK-12', 'MK-17', 'MK-18'].includes(id) && (
              <Button
                variant="outline"
                onClick={() => {
                  setPanel(null);
                  navigate('MK-19');
                }}
              >
                {uiText.text_9594cb09133d}
              </Button>
            )}
            <details>
              <summary>{uiText.text_396b98c02bdc}</summary>
              <div className="mk-menu-actions">
                {[
                  ['invitation-expired', uiText.text_a422d5b6b9b0, 'MK-27'],
                  ['invitation-revoked', uiText.text_2a09e0db479e, 'MK-27'],
                  ['capacity-full', uiText.text_fcfaf8ccf8c2, 'MK-28'],
                  ['manager-alternative', uiText.text_76143a7eab5d, 'MK-22'],
                  ['rejected', uiText.text_f84e6a3fa4b4, 'MK-12'],
                  ['cancelled', uiText.text_908814aad59f, 'MK-12'],
                  ['membership-rejected', uiText.text_b6614fc83c35, 'MK-29'],
                  ['membership-cancelled', uiText.text_34072bc8ad16, 'MK-29'],
                  ['no-permission', uiText.text_fa101e1ad831, id],
                  ['session-expired', uiText.text_610b53df0b74, id],
                  ['initial-error', uiText.text_51bded068d4c, id],
                  ['loading', uiText.text_3ebc8cefd354, id],
                ].map(([scenario, title, screen]) => (
                  <Button
                    key={scenario}
                    variant="ghost"
                    onClick={() => {
                      setPanel(null);
                      router.push('/preview/reference/' + screen + '?scenario=' + scenario);
                    }}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            </details>
            {!currentClass.managerAccepted && (
              <Button
                onClick={() => {
                  replaceScenario(service.current!.snapshot(), {
                    id: currentClass.managerUserId,
                    name: uiText.text_77f943ba162c,
                    reviewer: false,
                  });
                  setPanel(null);
                  setNotice(uiText.text_fd16bfe160a5);
                }}
              >
                {uiText.text_3193fed58b5c}
              </Button>
            )}
            {!currentClass.managerAccepted && (
              <Button
                variant="outline"
                onClick={() =>
                  void run(async () => {
                    await service.current!.acceptManagement(
                      currentClass.id,
                      currentClass.version,
                      operation.current,
                    );
                    setNotice(uiText.text_395338f44634);
                  })
                }
              >
                {uiText.text_250adf95a4ab}
              </Button>
            )}
          </div>
        ),
      });
      return;
    }
    if (label === uiText.text_9b1651192a2c) {
      setPanel({
        title: id === 'MK-35' ? uiText.text_3bf406fbc43a : uiText.text_921314c1d2ff,
        body: (
          <div className="mk-menu-actions">
            <p>{uiText.text_b4058f1b5351}</p>
            <Button
              onClick={() => {
                setPanel(null);
                navigate(id === 'MK-35' ? 'MK-36' : 'MK-12');
              }}
            >
              {id === 'MK-35' ? uiText.text_e4898b116639 : uiText.text_fdaebb3b9d21}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (control.classes.includes('date-cell')) {
      setValues((old) => ({ ...old, ['date-selection']: control.key }));
      setNotice(uiText.text_c586ff3f1981);
      return;
    }
    if (
      control.classes.includes('seg') ||
      [
        uiText.text_15270886eadd,
        uiText.text_740e6f513649,
        uiText.text_512b7d535f79,
        uiText.text_b3e662eb0f81,
        uiText.text_197ebc70e3d9,
        uiText.text_028b3c5809be,
        uiText.text_950b03b98425,
        uiText.text_410c47c7f8b7,
        uiText.text_952c0b87e7ca,
        uiText.text_68bfe264e2cf,
        uiText.text_376e9c9561e2,
        uiText.text_54753d4394ba,
        uiText.text_8fb4d0da9a42,
        uiText.text_2d6bdf75139c,
        uiText.text_856c3fe1b88b,
      ].includes(label)
    ) {
      setValues((old) => ({ ...old, ['selected-filter']: label }));
      setNotice('');
      return;
    }
    if (id === 'MK-01') {
      navigate('MK-02');
      return;
    }
    if (id === 'MK-02' && label.includes(uiText.text_d9f42fd33f34)) {
      const field = fieldControls[0];
      const phone = String(values[field?.key] ?? '09121234567')
        .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
        .replace(/\s/g, '');
      if (!/^09\d{9}$/.test(phone)) {
        setErrors({ [field.key]: uiText.text_efdbc7968390 });
        return;
      }
      navigate('MK-03');
      return;
    }
    if (id === 'MK-03') {
      if (label.includes(uiText.text_d6aa12d559e9)) {
        navigate('MK-02');
        return;
      }
      const otp = blueprint.controls.find((c) => c.kind === 'otp')!;
      if (normalizeClassNumber(String(values[otp.key] ?? '')).length !== 6) {
        setErrors({ [otp.key]: uiText.text_21f35c8e09bf });
        return;
      }
      navigate('MK-04');
      return;
    }
    if (['MK-13', 'MK-58'].includes(id) && label.includes(uiText.text_4c1f73ed8563)) {
      nextStep('details', 'MK-14');
      return;
    }
    if (id === 'MK-14' && label.includes(uiText.text_4c1f73ed8563)) {
      nextStep('audience', 'MK-15');
      return;
    }
    if (id === 'MK-15' && label.includes(uiText.text_4c1f73ed8563)) {
      nextStep('management', 'MK-16');
      return;
    }
    if (id === 'MK-16' && label.includes(uiText.text_f910f3eee6bb)) {
      void run(submitDraft);
      return;
    }
    if (label.includes(uiText.text_7701570756c1)) {
      navigate('MK-13');
      return;
    }
    if (label.includes(uiText.text_834b718ff95f) || label === uiText.text_24be1847ebf9) {
      setNewFormation(true);
      setDraft({ ...sampleClassDraft });
      try {
        sessionStorage.setItem('makan-reference-new-request', 'true');
      } catch {}
      navigate('MK-13');
      return;
    }
    if (
      label.includes(uiText.text_da035ca05d49) ||
      label.includes(uiText.text_bae5e3be9b88) ||
      label.includes(uiText.text_e0cbc2b21183)
    ) {
      if (id === 'MK-12') {
        const item = state.requests.find((r) => r.status === 'NeedsRevision');
        if (item) {
          chooseRequest(item);
          return;
        }
      }
      navigate(id === 'MK-12' ? 'MK-18' : 'MK-13');
      return;
    }
    if (label.includes(uiText.text_fb54b25f3f34)) {
      navigate('MK-11');
      return;
    }
    if (label.includes(uiText.text_f9feffa083c7)) {
      setPanel({
        title: uiText.text_6ac36fca17a2,
        body: (
          <div className="mk-menu-actions">
            <strong>{request.draft.title}</strong>
            <span>{requestLabels[request.status]}</span>
            <p>
              {uiText.text_97b66c63c4b7}
              <bdi>{request.id}</bdi>
            </p>
            <p>{request.reason ?? uiText.text_e122efb49936}</p>
            <ol>
              {request.history.map((e, i) => (
                <li key={i}>
                  {requestLabels[e.status]}
                  {e.reason ? ' · ' + e.reason : ''}
                </li>
              ))}
            </ol>
            <Button
              onClick={() => {
                setPanel(null);
                navigate('MK-12');
              }}
            >
              {uiText.text_cf80869f96ed}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (
      label.includes(uiText.text_4339b65f77f5) ||
      label === uiText.text_6cc35c20b549 ||
      label.includes(uiText.text_a999d2a5f36d)
    ) {
      navigate('MK-12');
      return;
    }
    if (label === uiText.text_7c61d113156b) {
      navigate('MK-11');
      return;
    }
    if (label.includes(uiText.text_ae57af37bd8e) || label === uiText.text_016c18389868) {
      navigate('MK-27');
      return;
    }
    if (label.includes(uiText.text_11cc456c93be) || label === uiText.text_05720edd09fb) {
      if (id !== 'MK-26') {
        navigate('MK-26');
        return;
      }
      const account = inviteTarget?.name;
      if (!account || !inviteTarget) {
        setErrors({ [fieldControls[0].key]: uiText.text_7efeea5e22a2 });
        return;
      }
      confirm(uiText.text_29accaf76dbd, async () => {
        await service.current!.invite(currentClass.id, inviteTarget.id, operation.current, {
          expiresAt: values['invite-expires'] ? String(values['invite-expires']) : undefined,
          message: String(
            values[fieldControls.find((c) => c.label === uiText.text_d2c2b7c7f4c1)?.key ?? ''] ??
              fieldControls.find((c) => c.label === uiText.text_d2c2b7c7f4c1)?.initial ??
              '',
          ),
        });
        setPanel({
          title: uiText.text_9a182eb0b238,
          body: (
            <>
              <p>
                {uiText.text_d957d424f8a2}
                {account}
                {uiText.text_f9d82c6084b2}
              </p>
              <Button
                onClick={() => {
                  const next = service.current!.snapshot();
                  replaceScenario(next, {
                    id: inviteTarget.id,
                    name: account,
                    reviewer: false,
                  });
                  setPanel(null);
                  navigate('MK-27');
                }}
              >
                {uiText.text_dcead88c087c}
              </Button>
            </>
          ),
        });
      });
      return;
    }
    if (id === 'MK-27' && /پذیرش|رد دعوت/.test(label)) {
      const consent = blueprint.controls.find((c) => c.kind === 'check')!;
      if (
        label.includes(uiText.text_049f94a440db) &&
        !Boolean(values[consent.key] ?? consent.checked)
      ) {
        setErrors({ [consent.key]: uiText.text_c6bc7acce0ac });
        return;
      }
      confirm(label, async () => {
        const invitation =
          state.invitations.find((x) => x.userId === actor.id && x.status === 'Pending') ??
          state.invitations.find((x) => x.userId === actor.id) ??
          state.invitations[0];
        await service.current!.respondInvitation(
          invitation.id,
          label.includes(uiText.text_049f94a440db),
          operation.current,
        );
        setNotice(
          label.includes(uiText.text_049f94a440db)
            ? uiText.text_0c55bf26c8f8
            : uiText.text_3445ecae3d02,
        );
      });
      return;
    }
    if (id === 'MK-28' && label.includes(uiText.text_3aceba34bd54)) {
      const consent = blueprint.controls.find((c) => c.kind === 'check')!;
      if (!Boolean(values[consent.key] ?? consent.checked)) {
        setErrors({ [consent.key]: uiText.text_55b110e71f95 });
        return;
      }
      void run(async () => {
        await service.current!.join(currentClass.id, operation.current);
        setPanel({
          title: uiText.text_ef5efcca20f2,
          body: (
            <>
              <p>{uiText.text_b3ea477f3365}</p>
              <Button
                onClick={() =>
                  void run(async () => {
                    const join = service
                      .current!.snapshot()
                      .joins.find((x) => x.userId === actor.id && x.status === 'Pending');
                    if (join) await service.current!.cancelJoin(join.id, operation.current);
                    setNotice(uiText.text_559f305cf223);
                  })
                }
              >
                {uiText.text_3db45b046339}
              </Button>
            </>
          ),
        });
      });
      return;
    }
    if (id === 'MK-29' && [uiText.text_049f94a440db, uiText.text_17f7016ec3a0].includes(label)) {
      const buttons = blueprint.controls.filter((c) => c.label === label);
      const join = state.joins[buttons.findIndex((c) => c.key === control.key)] ?? state.joins[0];
      confirm(label, async () => {
        await service.current!.reviewJoin(
          join.id,
          label === uiText.text_049f94a440db,
          uiText.text_eee8c44a7424,
          operation.current,
        );
        setNotice(uiText.text_3041aa53b155);
      });
      return;
    }
    if (
      id === 'MK-19' &&
      [uiText.text_b4861537aac8, uiText.text_a58310e67d4b, uiText.text_17f7016ec3a0].includes(label)
    ) {
      const reasonField = fieldControls.find((c) => c.label.includes(uiText.text_67c2ebd31ebe))!;
      const reason = String(values[reasonField.key] ?? '').trim();
      if (label !== uiText.text_b4861537aac8 && !reason) {
        setErrors((old) => ({ ...old, [reasonField.key]: uiText.text_766e2c802360 }));
        return;
      }
      confirm(
        uiText.text_54cbdf185fe9,
        async () => {
          const req = request;
          await service.current!.decide(
            req.id,
            req.version,
            label === uiText.text_b4861537aac8
              ? 'Approved'
              : label === uiText.text_17f7016ec3a0
                ? 'Rejected'
                : 'NeedsRevision',
            reason,
            draft.managerUserId,
            operation.current,
            draft.teacherUserId,
          );
          navigate(
            label === uiText.text_b4861537aac8
              ? 'MK-20'
              : label === uiText.text_a58310e67d4b
                ? 'MK-18'
                : 'MK-12',
          );
        },
        uiText.text_7877e4e7761f,
      );
      return;
    }
    if (label === uiText.text_be9b8b4f2b98) {
      void run(async () => {
        await service.current!.retrySetup(currentClass.id, currentClass.version, operation.current);
        navigate('MK-22');
      });
      return;
    }
    if (label === uiText.text_7735e78fb13b) {
      if (!currentClass.managerAccepted) {
        confirm(
          uiText.text_4439b16b9c90,
          async () => {
            await service.current!.acceptManagement(
              currentClass.id,
              currentClass.version,
              operation.current,
            );
            setNotice(uiText.text_8938550ea763);
          },
          uiText.text_8d7e2bbd83fa,
        );
        return;
      }
      const rules = blueprint.controls.find((c) => c.kind === 'check');
      if (rules && !Boolean(values[rules.key] ?? rules.checked)) {
        setErrors({ [rules.key]: uiText.text_2a19e9b9963b });
        return;
      }
      confirm(
        uiText.text_7735e78fb13b,
        async () => {
          await service.current!.start(currentClass.id, currentClass.version, operation.current);
          navigate('MK-24');
        },
        uiText.text_de297c4dbab1,
      );
      return;
    }
    if (label.includes(uiText.text_2226ed46e579) || label === uiText.text_0da1a8c67599) {
      if (!activeClassMember(currentClass, actor.id)) {
        setNotice(uiText.text_92270a0ed8ef);
        return;
      }
      navigate('MK-32');
      return;
    }
    if (label.includes(uiText.text_5011c7a1dedf)) {
      if (!activeClassMember(currentClass, actor.id)) {
        setNotice(uiText.text_9c4951dde39f);
        return;
      }
      navigate('MK-33');
      return;
    }
    if (label.includes(uiText.text_908693ff0cba) || label.includes(uiText.text_49b752556153)) {
      navigate('MK-29');
      return;
    }
    if (
      label === uiText.text_102f79b3f87c ||
      label.includes(uiText.text_8d178554791f) ||
      label.includes(uiText.text_29c02fa4bd09) ||
      label.includes(uiText.text_8fa7aa90f55a)
    ) {
      navigate('MK-30');
      return;
    }
    if (label === uiText.text_ca3c4420b9b8) {
      navigate('MK-24');
      return;
    }
    if (
      label === uiText.text_0ac642a80e31 ||
      label.includes(uiText.text_912b977de5c5) ||
      label.includes(uiText.text_619e2e1b60d3) ||
      label.includes(uiText.text_1973f701ecea)
    ) {
      navigate('MK-34');
      return;
    }
    if (control.classes.includes('chat-row')) {
      navigate(
        label.includes(uiText.text_2db356b462dd)
          ? 'MK-33'
          : label.includes(uiText.text_a77ab70e230c)
            ? 'MK-32'
            : 'MK-36',
      );
      return;
    }
    if (['MK-30', 'MK-57'].includes(id) && control.classes === 'row') {
      chooseMember(currentClass.members.find((m) => label.includes(m.name)) ?? member);
      return;
    }
    if (id === 'MK-31' && label === uiText.text_3558e4dc3b32) {
      void run(async () => {
        const cls = currentClass;
        await service.current!.updateMember(
          cls.id,
          member.id,
          String(mappedValues[fieldControls[0]?.key] ?? fieldControls[0]?.initial ?? ''),
          String(mappedValues[fieldControls[2]?.key] ?? fieldControls[2]?.initial ?? ''),
          cls.version,
        );
        setNotice(uiText.text_22c12e862be8);
      });
      return;
    }
    if (label === uiText.text_527d96731d9c || label.includes(uiText.text_4762b601ff6f)) {
      if (id === 'MK-31') {
        void run(async () => {
          await service.current!.endMembership(
            currentClass.id,
            member.id,
            String(
              mappedValues[fieldControls[3]?.key] ??
                fieldControls[3]?.initial ??
                uiText.text_a99e23c0ede7,
            ),
            operation.current,
          );
          setValues((old) => ({ ...old, 'member-end-open': false }));
          setNotice(uiText.text_fbf967f76a57);
        });
        return;
      }
      confirm(
        uiText.text_834f101a5d46,
        async () => {
          const cls = currentClass,
            target = id === 'MK-31' ? member : cls.members.find((x) => x.userId === actor.id)!;
          await service.current!.endMembership(
            cls.id,
            target.id,
            String(values[fieldControls[3]?.key] ?? uiText.text_a99e23c0ede7),
            operation.current,
          );
          setNotice(uiText.text_fbf967f76a57);
        },
        uiText.text_a60abb0f35cb,
      );
      return;
    }
    if (label === uiText.text_fa7af603d430) {
      if (id === 'MK-31') setValues((old) => ({ ...old, 'member-end-open': false }));
      else navigate('MK-30');
      return;
    }
    if (label.includes(uiText.text_81ccc340065e)) {
      setPanel({
        title: uiText.text_ec9d1edb4e75,
        body: (
          <p>
            {uiText.text_e4f52d9f9441}
            <br />
            {uiText.text_82412d223c0f}
          </p>
        ),
      });
      return;
    }
    if (label.includes(uiText.text_e0cf9df9d9b9)) {
      setPanel({
        title: uiText.text_71f0be15159e,
        body: (
          <div className="mk-menu-actions">
            <Button onClick={() => navigate('MK-04')}>{uiText.text_9258221d3011}</Button>
            <Button onClick={() => navigate('MK-11')}>{uiText.text_54ebe43679b6}</Button>
            <Button variant="outline" onClick={() => navigate('MK-59')}>
              {uiText.text_8152013c316a}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (
      label.includes(uiText.text_3a2a401438ce) ||
      label === uiText.text_3b15ef5a6e60 ||
      label.includes(uiText.text_82816677af56)
    ) {
      navigate('MK-41');
      return;
    }
    if (label.includes(uiText.text_f0840638365c) || label.includes(uiText.text_49475717c2c3)) {
      navigate('MK-49');
      return;
    }
    if (label.includes(uiText.text_891a7f6ecdae)) {
      setPanel({
        title: uiText.text_343001b0489f,
        body: (
          <div className="mk-menu-actions">
            {[uiText.text_be9fd3bd1ba1, uiText.text_9a0be82749f7, uiText.text_a11180341c26].map(
              (name, index) => (
                <Button
                  key={name}
                  onClick={() => {
                    document.documentElement.dataset.theme =
                      index === 1
                        ? 'dark'
                        : index === 2 && matchMedia('(prefers-color-scheme: dark)').matches
                          ? 'dark'
                          : 'light';
                    setNotice(uiText.text_b3383e10a68d);
                  }}
                >
                  {name}
                </Button>
              ),
            )}
            <Button variant="outline" onClick={() => navigate('MK-48')}>
              {uiText.text_7cf593010df3}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (
      label.includes(uiText.text_b78a1a6a8451) ||
      label.includes(uiText.text_1fae3b3594a2) ||
      label.includes(uiText.text_57a589c9fcdc)
    ) {
      confirm(
        uiText.text_6eb3421f995b,
        () => {
          setNotice(uiText.text_128658239154);
        },
        uiText.text_dcf1e9a7abba,
      );
      return;
    }
    if (label.includes(uiText.text_d7ef164dd6b8)) {
      setPanel({
        title: uiText.text_3393e0c3cb74,
        body: <p>{uiText.text_eae6e5195be0}</p>,
      });
      return;
    }
    if (label.includes(uiText.text_5f65ccdf701b) || label.includes(uiText.text_a2af9c4ab7db)) {
      if (id === 'MK-55') {
        setNotice(uiText.text_6d4ada662964);
        return;
      }
      setNotice(uiText.text_c3452380ec9a);
      return;
    }
    if (label.includes(uiText.text_e1174ae8f3c8)) {
      navigate('MK-39');
      return;
    }
    if (id === 'MK-39' && label.includes(uiText.text_2d5d767e34ab)) {
      if (!sourceCount) {
        setNotice(uiText.text_10cde02b2da4);
        return;
      }
      navigate('MK-38');
      return;
    }
    if (id === 'MK-39' && label.includes(uiText.text_f7b3cdaee0a4)) {
      setNotice(uiText.text_9acb7e5003e7);
      return;
    }
    if (id === 'MK-39' && control.classes === 'row') {
      const check = blueprint.controls.find(
        (c) => c.kind === 'check' && Number(c.key) > Number(control.key),
      );
      if (check) change(check, !(values[check.key] ?? check.checked));
      return;
    }
    if (
      [uiText.text_8957887c2b2f, uiText.text_e7b1ccd0bda3, uiText.text_8dfd6e9f41b6].includes(
        label,
      ) &&
      id === 'MK-39'
    ) {
      setValues((old) => ({ ...old, ['source-scope']: label }));
      setNotice(uiText.text_08b5244a1633 + label + uiText.text_b91e0fdb4d20);
      return;
    }
    if (['MK-38', 'MK-52'].includes(id) && /نکته اصلی|مثال|برنامه بده/.test(label)) {
      navigate('MK-40');
      return;
    }
    if (label === uiText.text_51dd685556b8) {
      const field = blueprint.controls.find(
        (c) => c.kind === 'compose' || c.kind === 'assistantCompose',
      );
      if (!field || !String(values[field.key] ?? '').trim()) {
        setNotice(uiText.text_d08330d29e1f);
        return;
      }
      if (['MK-38', 'MK-52'].includes(id)) {
        navigate('MK-40');
        return;
      }
      setValues((old) => ({
        ...old,
        ['sent-message-' + Object.keys(old).length]: String(old[field.key]),
        [field.key]: '',
      }));
      setNotice(uiText.text_dcba734f9836);
      return;
    }
    if (label === uiText.text_3b90dccc67d9) {
      navigate('MK-36');
      setNotice(uiText.text_dd7716f243c0);
      return;
    }
    if (label === uiText.text_fcc5b6fed863) {
      void navigator.clipboard.writeText(uiText.text_557e37b5eb3b).then(
        () => setNotice(uiText.text_fbe358fbc43d),
        () => setNotice(uiText.text_d9e90113e5c6),
      );
      return;
    }
    if (label === uiText.text_313cbecb4dd3) {
      navigate('MK-36');
      return;
    }
    if (label === uiText.text_ab182e469ee4) {
      setPanel({
        title: uiText.text_eb738f9c4868,
        body: (
          <div className="mk-menu-actions">
            <Button
              onClick={() => {
                setNotice(uiText.text_2b22adfc679e);
                setPanel(null);
              }}
            >
              {uiText.text_d3fb230de921}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotice(uiText.text_2b22adfc679e);
                setPanel(null);
              }}
            >
              {uiText.text_0a6f0bcc8f7a}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (label === uiText.text_479a5da6e735 || label === uiText.text_984f13cff775) {
      confirm(
        label,
        () => {
          setValues((old) => ({ ...old, [label]: true }));
          setNotice(label + uiText.text_292e8d046820);
        },
        uiText.text_a9eaeafc1942,
      );
      return;
    }
    if (label === uiText.text_35c84a68f506) {
      navigate('MK-30');
      return;
    }
    if (label === uiText.text_1d488a965baa) {
      navigate('MK-42');
      return;
    }
    if (label.includes(uiText.text_79021bcbc3e9) && id === 'MK-41') {
      navigate('MK-43');
      return;
    }
    if (label.includes(uiText.text_c33fc243e737)) {
      setPanel({
        title: uiText.text_445fa1a87aa7,
        body: (
          <div>
            <p>{uiText.text_26d21991a70b}</p>
            <p>
              {uiText.text_e7df3741466b}
              {currentClass.title}
              {uiText.text_8b437a6e118d} {currentClass.capacity.toLocaleString('fa-IR')}
            </p>
            <Button
              onClick={() => {
                setValues((old) => ({
                  ...old,
                  'conflict-reviewed': true,
                  'conflict-dismissed': true,
                }));
                setPanel(null);
              }}
            >
              {uiText.text_347ff0c553c2}
            </Button>
          </div>
        ),
      });
      return;
    }
    if (label.includes(uiText.text_19aa3b256f52)) {
      if (id === 'MK-55') setValues((old) => ({ ...old, 'conflict-dismissed': true }));
      else navigate('MK-13');
      return;
    }
    if (label.includes(uiText.text_f012657cc1b9)) {
      navigate('MK-10');
      return;
    }
    if (['MK-23', 'MK-24', 'MK-25', 'MK-56'].includes(id)) {
      const educationTarget =
        label === uiText.text_e8fed4d47d62
          ? 'MK-44'
          : label === uiText.text_4f7293cf5780
            ? 'MK-66'
            : label === uiText.text_d06ede345521
              ? 'MK-60'
              : label === uiText.text_7dabefaf145f
                ? 'MK-69'
                : label.includes(uiText.text_e5dbd74f8f72)
                  ? 'MK-62'
                  : label.startsWith(uiText.text_2dc8c7c23f8a)
                    ? 'MK-45'
                    : label.startsWith(uiText.text_affad8d9215a)
                      ? 'MK-67'
                      : label.includes(uiText.text_26a454da5b8d)
                        ? 'MK-65'
                        : null;
      if (educationTarget) {
        navigate(educationTarget);
        return;
      }
    }
    if (
      label.includes(uiText.text_1bddb7967eab) ||
      label.includes(uiText.text_affbc3022ea5) ||
      label.includes(uiText.text_b9bdf50e5da3)
    ) {
      navigate('MK-06');
      return;
    }
    if (label.includes(uiText.text_6c1cc803e034)) {
      confirm(
        uiText.text_c23c4af7833f,
        () => setNotice(uiText.text_f7f0c2c5249c),
        uiText.text_ede7a5a64c4b,
      );
      return;
    }
    if (control.classes.includes('quiz-option')) {
      const radio = nodesOf(nodes.find((n) => n.key === control.key)!).find(
        (n) => n.control?.kind === 'radio',
      )?.control;
      if (radio) change(radio, true);
      return;
    }
    if (label === uiText.text_55a4c60d6645) {
      if (!values['quiz-choice']) {
        setNotice(uiText.text_26cd5413b68a);
        return;
      }
      confirm(
        uiText.text_2dd10ba71f63,
        () => setNotice(uiText.text_44c6965aa44f),
        uiText.text_23a983d43570,
      );
      return;
    }
    if (
      label.includes(uiText.text_92a933f37183) ||
      label.includes(uiText.text_8c471f14ee5a) ||
      label.includes(uiText.text_53bf8fef7c70)
    ) {
      navigate(id === 'MK-44' ? 'MK-45' : 'MK-05');
      return;
    }
    if (label.includes(uiText.text_82ec67c14936) || label === uiText.text_ca0f901fdf49) {
      setPanel({
        title: uiText.text_0465a6813992,
        body: (
          <p>
            {uiText.text_5135a6addb95}
            <br />
            {uiText.text_04e1ff0aaf2d}
          </p>
        ),
      });
      return;
    }
    if (label.includes(uiText.text_2000c11f322c) || label.includes(uiText.text_355328c613fa)) {
      setPanel({
        title: uiText.text_3c9ece5ae8bd,
        body: (
          <>
            <p>{uiText.text_8d2741d1bcc7}</p>
            <Button
              variant="outline"
              onClick={() =>
                void run(async () => {
                  const cls = currentClass;
                  await service.current!.acceptManagement(cls.id, cls.version, operation.current);
                  setNotice(uiText.text_5127aa358283);
                })
              }
            >
              {uiText.text_250adf95a4ab}
            </Button>
          </>
        ),
      });
      return;
    }
    if (
      label.includes('.pdf') ||
      label.includes('.jpg') ||
      label.includes(uiText.text_bd076adea788) ||
      label.includes(uiText.text_de32eb7bf53f)
    ) {
      setPanel({
        title: uiText.text_188f29c36f33,
        body: <p>{uiText.text_cb6d3ed3b868}</p>,
      });
      return;
    }
    if (
      label.includes(uiText.text_9b2ba45fbd35) ||
      label.includes(uiText.text_9a45c4c0c591) ||
      label.includes(uiText.text_7d7e2a7bf517)
    ) {
      setPanel({
        title: uiText.text_f0f1f9bfe08a,
        body: (
          <ol>
            {request.history.map((event, index) => (
              <li key={index}>
                {event.status === 'UnderReview'
                  ? uiText.text_f71cd91dad22
                  : event.status === 'Submitted'
                    ? uiText.text_e7e0f393d418
                    : (event.reason ?? event.status)}
              </li>
            ))}
          </ol>
        ),
      });
      return;
    }
    if (label === uiText.text_12e9b2eceeab) {
      setPanel({
        title: uiText.text_29c02fa4bd09,
        body: (
          <div className="mk-menu-actions">
            {currentClass.members
              .filter((m) => m.status === 'Active')
              .map((member) => (
                <Button
                  variant="ghost"
                  key={member.id}
                  onClick={() => {
                    setPanel(null);
                    chooseMember(member);
                  }}
                >
                  {member.localName || member.name}
                  {uiText.text_78887da22764}{' '}
                  {member.roles.includes('Manager')
                    ? uiText.text_e165f50197d6
                    : uiText.text_5cc696912f59}
                </Button>
              ))}
          </div>
        ),
      });
      return;
    }
    if (label === uiText.text_2078be43559b) {
      setPanel({
        title: uiText.text_08902bd2fe52,
        body: (
          <div className="mk-menu-actions">
            {[uiText.text_15270886eadd, uiText.text_2d6bdf75139c, uiText.text_856c3fe1b88b].map(
              (role) => (
                <Button
                  key={role}
                  onClick={() => {
                    setValues((old) => ({ ...old, 'selected-filter': role }));
                    setPanel(null);
                  }}
                >
                  {role}
                </Button>
              ),
            )}
          </div>
        ),
      });
      return;
    }
    if (label.includes(uiText.text_8740f76bc170) || label.includes(uiText.navigation_settings)) {
      navigate('MK-48');
      return;
    }
    if (label.includes(uiText.text_5cc696912f59) || label.includes(uiText.text_fb4c8c6d1e7e)) {
      navigate('MK-31');
      return;
    }
    // Informational reference rows open their full detail instead of being inert.
    setPanel({
      title: label.slice(0, 80),
      body: (
        <p>
          {label}
          <br />
          {uiText.text_02bf59a552aa}
        </p>
      ),
    });
  }
  if (!ready)
    return (
      <div className="bootstrap" role="status">
        {uiText.text_e873b8b4a504}
      </div>
    );
  const bodyNode = nodes.find((n) =>
    n.attrs.className?.split(' ').some((c) => c === 'app-body' || c === 'chat-bg'),
  );
  const replacements: Record<string, ReactNode> = {};
  if (id === 'MK-19' && (changed || selectedRequestId)) {
    const queue = nodes.find((n) => n.attrs.className === 'queue');
    const search = blueprint.controls.find((c) => c.kind === 'search')!;
    if (queue)
      replacements[queue.key] = (
        <div className="queue">
          <h3 className="small">{uiText.text_77a0998859ae}</h3>
          <label className="search">
            <input
              aria-label={uiText.text_7986fabd302c}
              value={query}
              placeholder={uiText.text_7986fabd302c}
              onChange={(event) => change(search, event.target.value)}
            />
          </label>
          {state.requests
            .filter((r) => (r.id + ' ' + r.draft.title).includes(query))
            .map((r) => (
              <button
                className={'q-row ' + (r.id === request.id ? 'sel' : '')}
                key={r.id}
                onClick={() => selectReviewRequest(r)}
              >
                <b>{r.draft.title}</b>
                <p>{requestLabels[r.status]}</p>
              </button>
            ))}
        </div>
      );
  }
  if (id === 'MK-31' && !memberSheetOpen)
    for (const cls of ['veil', 'sheet-modal']) {
      const node = nodes.find((n) => n.attrs.className === cls);
      if (node) replacements[node.key] = null;
    }
  if (id === 'MK-55' && values['conflict-dismissed'])
    for (const cls of ['veil', 'sheet-modal']) {
      const node = nodes.find((n) => n.attrs.className === cls);
      if (node) replacements[node.key] = null;
    }
  if (id === 'MK-26' && (inviteSearch || !inviteTarget)) {
    const card = nodes.find((n) => n.attrs.className?.split(' ').includes('hero'));
    if (card)
      replacements[card.key] = (
        <div className="card">
          <h3>{uiText.text_0faa9b90eaaa}</h3>
          <div className="mk-menu-actions">
            {inviteTargets
              .filter((t) => (t.name + ' ' + t.username).includes(inviteSearch))
              .map((t) => (
                <button
                  className="btn secondary"
                  key={t.id}
                  onClick={() =>
                    setValues((old) => ({
                      ...old,
                      [fieldControls[0].key]: '',
                      'invite-target': t.id,
                      ...Object.fromEntries(
                        blueprint.controls
                          .filter((c) => c.kind === 'checkCircle')
                          .map((c) => [c.key, true]),
                      ),
                    }))
                  }
                >
                  {t.name}
                  {uiText.text_588da4105320}
                  <bdi>{t.username}</bdi>
                </button>
              ))}
          </div>
          {!inviteTargets.some((t) => (t.name + ' ' + t.username).includes(inviteSearch)) && (
            <p>{uiText.text_35870749f48e}</p>
          )}
        </div>
      );
  }
  if (noResults) {
    const first = candidates[0];
    hidden.delete(first.key);
    replacements[first.key] = (
      <div className="empty">
        <h3>{uiText.text_b548ad60076f}</h3>
        <p>{uiText.text_3ad433adb9b3}</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setValues({});
          }}
        >
          {uiText.text_a7950e65087d}
        </button>
      </div>
    );
  }
  if (id === 'MK-12' && bodyNode && (changed || ['rejected', 'cancelled'].includes(scenario))) {
    const items = state.requests.filter(
      (r) =>
        filter === uiText.text_15270886eadd ||
        (filter === uiText.text_950b03b98425 && ['UnderReview', 'Submitted'].includes(r.status)) ||
        requestLabels[r.status] === filter,
    );
    replacements[bodyNode.key] = (
      <main className="app-body">
        <div className="chips">
          {[
            uiText.text_15270886eadd,
            uiText.text_950b03b98425,
            uiText.text_952c0b87e7ca,
            uiText.text_410c47c7f8b7,
          ].map((name) => (
            <button
              className={'chip ' + (filter === name ? 'on' : '')}
              key={name}
              onClick={() => setValues((old) => ({ ...old, 'selected-filter': name }))}
            >
              {name}
            </button>
          ))}
        </div>
        {items.length ? (
          items.map((r) => (
            <div key={r.id} className="card">
              <div className="between">
                <span className="badge neutral">{requestLabels[r.status]}</span>
                <span className="tiny muted">{uiText.text_834b718ff95f}</span>
              </div>
              <h3>{r.draft.title}</h3>
              <p>{r.reason ?? r.draft.description}</p>
              <button className="btn secondary" onClick={() => chooseRequest(r)}>
                {r.status === 'NeedsRevision'
                  ? uiText.text_da035ca05d49
                  : r.status === 'Draft'
                    ? uiText.text_777f6e641800
                    : uiText.text_f9feffa083c7}
              </button>
            </div>
          ))
        ) : (
          <div className="empty">
            <h3>{uiText.text_84532713934e}</h3>
          </div>
        )}
      </main>
    );
  }
  if (['MK-30', 'MK-57'].includes(id) && bodyNode && changed) {
    const members = currentClass.members.filter(
      (m) =>
        m.status === 'Active' &&
        (!query || (m.localName || m.name).includes(query)) &&
        (filter === uiText.text_15270886eadd ||
          (filter === uiText.text_2d6bdf75139c && m.roles.includes('Manager')) ||
          (filter === uiText.text_856c3fe1b88b && m.roles.includes('Learner'))),
    );
    const search = blueprint.controls.find((c) => c.kind === 'search')!;
    replacements[bodyNode.key] = (
      <main className="app-body">
        <label className="search">
          <input
            aria-label={uiText.text_bd48b6b60f08}
            placeholder={uiText.text_bd48b6b60f08}
            value={String(values[search.key] ?? '')}
            onChange={(event) => change(search, event.target.value)}
          />
        </label>
        <div className="seg">
          {[uiText.text_15270886eadd, uiText.text_2d6bdf75139c, uiText.text_856c3fe1b88b].map(
            (name) => (
              <button
                className={filter === name ? 'on' : ''}
                key={name}
                onClick={() => setValues((old) => ({ ...old, 'selected-filter': name }))}
              >
                {name}
              </button>
            ),
          )}
        </div>
        <div className="list">
          {members.map((m) => (
            <button
              className="row"
              key={m.id}
              disabled={!previewManager}
              onClick={() => chooseMember(m)}
            >
              <span className="avatar">{(m.localName || m.name)[0]}</span>
              <span className="grow">
                <h4>{m.localName || m.name}</h4>
                <p>
                  {m.roles.includes('Manager')
                    ? uiText.text_8147a634c05f
                    : uiText.text_5cc696912f59}
                </p>
              </span>
            </button>
          ))}
        </div>
        {!members.length && (
          <div className="empty">
            <h3>{uiText.text_136ccbbd71bd}</h3>
          </div>
        )}
      </main>
    );
  }
  if (id === 'MK-29' && bodyNode && (changed || scenario.startsWith('membership-'))) {
    const labels = {
      Pending: uiText.text_caac18ea6580,
      Approved: uiText.text_479574e266a4,
      Rejected: uiText.text_c7009e8ab420,
      Cancelled: uiText.text_da0be651e135,
    };
    replacements[bodyNode.key] = (
      <main className="app-body">
        {state.joins
          .filter((j) => j.classId === currentClass.id)
          .map((j) => (
            <div className="card" key={j.id}>
              <h3>{j.name}</h3>
              <span className="badge neutral">{labels[j.status]}</span>
              {j.status === 'Pending' && (
                <div className="button-row">
                  <button
                    className="btn"
                    onClick={() =>
                      confirm(uiText.text_fd3f49ffc9dc, () =>
                        service
                          .current!.reviewJoin(
                            j.id,
                            true,
                            uiText.text_eee8c44a7424,
                            operation.current,
                          )
                          .then(() => {}),
                      )
                    }
                  >
                    {uiText.text_049f94a440db}
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      confirm(uiText.text_6f7511ffc62c, () =>
                        service
                          .current!.reviewJoin(
                            j.id,
                            false,
                            uiText.text_fd08411d8550,
                            operation.current,
                          )
                          .then(() => {}),
                      )
                    }
                  >
                    {uiText.text_17f7016ec3a0}
                  </button>
                </div>
              )}
            </div>
          ))}
      </main>
    );
  }
  const reviewDraft = id === 'MK-16' ? draft : request.draft;
  if (
    (id === 'MK-16' && JSON.stringify(draft) !== JSON.stringify(sampleClassDraft)) ||
    (id === 'MK-19' && (changed || selectedRequestId))
  ) {
    const summary = nodes.find(
      (n) => n.attrs.className === (id === 'MK-16' ? 'card' : 'review-summary'),
    );
    if (summary)
      replacements[summary.key] = (
        <div className={id === 'MK-16' ? 'card' : 'review-summary'}>
          {id === 'MK-16' && <h3>{reviewDraft.title}</h3>}
          <p>{reviewDraft.description}</p>
          {[
            [uiText.text_5b5353ab5636, reviewDraft.level],
            [uiText.text_3a6f00dc84e1, reviewDraft.capacity + uiText.text_56bfaedd15bf],
            [
              uiText.text_005d2e7ec4f6,
              reviewDraft.managerUserId === previewAccount.id
                ? previewAccount.name
                : uiText.text_005d2e7ec4f6,
            ],
            [
              uiText.text_2000c11f322c,
              reviewDraft.teacherUserId ? uiText.text_b7a54e700d6f : uiText.text_1f47a215177a,
            ],
          ].map(([key, value]) => (
            <div className="kv" key={key}>
              <span className="key">{key}</span>
              <span className="val">{value}</span>
            </div>
          ))}
        </div>
      );
  }
  if (id === 'MK-17' && bodyNode && changed)
    replacements[bodyNode.key] = (
      <main className="app-body">
        <div className="success-mark">
          <Check />
        </div>
        <div className="center">
          <h3>{requestLabels[request.status]}</h3>
          <p>{request.draft.title}</p>
          <p className="muted small">{request.reason ?? uiText.text_b7846dc8654f}</p>
        </div>
        <div className="card">
          <p>{uiText.text_9155c5e6b769}</p>
          <bdi className="tiny">{request.id}</bdi>
          <ol>
            {request.history.map((e, i) => (
              <li key={i}>
                {requestLabels[e.status]}
                {e.reason ? ' · ' + e.reason : ''}
              </li>
            ))}
          </ol>
        </div>
        <button
          className="btn secondary"
          onClick={() => action({ ...blueprint.controls[0], label: uiText.text_f9feffa083c7 })}
        >
          {uiText.text_f9feffa083c7}
        </button>
      </main>
    );
  const protectedClass = [
    'MK-22',
    'MK-23',
    'MK-24',
    'MK-25',
    'MK-26',
    'MK-29',
    'MK-30',
    'MK-31',
    'MK-32',
    'MK-33',
    'MK-34',
    'MK-56',
    'MK-57',
  ].includes(id);
  const managerView = ['MK-24', 'MK-26', 'MK-29', 'MK-31', 'MK-56'].includes(id);
  const forbidden =
    changed &&
    protectedClass &&
    (!activeClassMember(currentClass, actor.id) ||
      (managerView && (currentClass.managerUserId !== actor.id || !currentClass.managerAccepted)));
  if (forbidden && bodyNode) {
    replacements[bodyNode.key] = (
      <main className="app-body">
        <div className="empty">
          <h3>{uiText.text_c269c060f0fe}</h3>
          <p>{uiText.text_1f545b985edb}</p>
          <button className="btn secondary" onClick={() => navigate('MK-11')}>
            {uiText.text_ac06972caa41}
          </button>
        </div>
      </main>
    );
    for (const cls of ['composer', 'fixed-actions', 'veil', 'sheet-modal']) {
      const n = nodes.find((n) => n.attrs.className === cls);
      if (n) replacements[n.key] = null;
    }
  }
  if (id === 'MK-19' && !actor.reviewer) {
    const desk = nodes.find((n) => n.attrs.className === 'desk-body');
    if (desk)
      replacements[desk.key] = (
        <main className="desk-body">
          <div className="empty">
            <h3>{uiText.text_56762f9181a4}</h3>
            <button className="btn secondary" onClick={() => navigate('MK-11')}>
              {uiText.text_ac06972caa41}
            </button>
          </div>
        </main>
      );
  }
  if (
    bodyNode &&
    ['no-permission', 'session-expired', 'initial-error', 'loading'].includes(scenario)
  )
    replacements[bodyNode.key] = (
      <main className="app-body">
        <div className="empty">
          <h3>
            {scenario === 'no-permission'
              ? uiText.text_c269c060f0fe
              : scenario === 'session-expired'
                ? uiText.text_f5f09b132f2c
                : scenario === 'loading'
                  ? uiText.text_b5903289942f
                  : uiText.text_386472a75f51}
          </h3>
          <p>
            {scenario === 'no-permission'
              ? uiText.text_14a21f2cbbb9
              : scenario === 'session-expired'
                ? uiText.text_ed38a7af81fd
                : uiText.text_430cbe15c000}
          </p>
          <button
            className="btn secondary"
            onClick={() => (scenario === 'session-expired' ? navigate('MK-02') : setScenario(''))}
          >
            {scenario === 'session-expired'
              ? uiText.text_bbb8499c21d0
              : scenario === 'no-permission'
                ? uiText.text_addbcaad4083
                : uiText.text_be9b8b4f2b98}
          </button>
        </div>
      </main>
    );
  const otpButton = blueprint.controls.find((c) => c.label === uiText.auth_verify);
  const disabled = new Set<string>();
  if (id === 'MK-30' && changed && !previewManager)
    blueprint.controls.filter((c) => /دعوت/.test(c.label)).forEach((c) => hidden.add(c.key));
  if (id === 'MK-31' && member.userId === currentClass.managerUserId) {
    const end = blueprint.controls.find((c) => c.label === uiText.text_527d96731d9c);
    if (end) disabled.add(end.key);
  }
  if (id === 'MK-19' && !actor.reviewer)
    blueprint.controls
      .filter((c) =>
        [uiText.text_b4861537aac8, uiText.text_a58310e67d4b, uiText.text_17f7016ec3a0].includes(
          c.label,
        ),
      )
      .forEach((c) => disabled.add(c.key));
  if (busy)
    blueprint.controls.filter((c) => c.kind === 'action').forEach((c) => disabled.add(c.key));
  if (id === 'MK-39' && !sourceCount) {
    const use = blueprint.controls.find((c) => c.label.includes(uiText.text_2d5d767e34ab));
    if (use) disabled.add(use.key);
  }
  if (
    id === 'MK-27' &&
    state.invitations
      .filter((x) => x.userId === actor.id)
      .every(
        (x) =>
          x.status !== 'Pending' || Date.parse(x.expiresAt) < Date.parse('2026-11-02T07:12:00Z'),
      )
  )
    blueprint.controls
      .filter((c) => /پذیرش دعوت|رد دعوت/.test(c.label))
      .forEach((c) => disabled.add(c.key));
  if (id === 'MK-25')
    blueprint.controls
      .filter((c) => /دعوت|ارسال|شروع|ذخیره/.test(c.label))
      .forEach((c) => disabled.add(c.key));
  return (
    <>
      <ReferenceScreen
        id={id}
        preview
        bindings={{
          dialogKey:
            id === 'MK-31'
              ? String(memberSheetOpen)
              : id === 'MK-55'
                ? String(values['conflict-dismissed'])
                : undefined,
          values: mappedValues,
          heading: {
            title:
              id === 'MK-31' && (selectedMemberId || changed)
                ? member.localName || member.name
                : changed &&
                    [
                      'MK-22',
                      'MK-23',
                      'MK-24',
                      'MK-25',
                      'MK-32',
                      'MK-33',
                      'MK-34',
                      'MK-56',
                    ].includes(id)
                  ? currentClass.title
                  : undefined,
          },
          errors,
          hidden,
          classes,
          replacements,
          after: bodyNode
            ? {
                [bodyNode.key]: (
                  <>
                    {id === 'MK-31' &&
                      !memberSheetOpen &&
                      member.status === 'Active' &&
                      member.userId !== currentClass.managerUserId && (
                        <button
                          className="btn danger"
                          onClick={() => setValues((old) => ({ ...old, 'member-end-open': true }))}
                        >
                          {uiText.text_527d96731d9c}
                        </button>
                      )}
                    {Object.entries(values)
                      .filter(([key]) => key.startsWith('sent-message-'))
                      .map(([key, value]) => (
                        <div className="bubble mine" key={key}>
                          <div className="message" dir="auto">
                            {value}
                          </div>
                          <div className="msg-time">{uiText.text_726393748959}</div>
                        </div>
                      ))}
                  </>
                ),
              }
            : undefined,
          disabled,
          enabled: new Set(
            otpButton &&
            normalizeClassNumber(
              String(values[blueprint.controls.find((c) => c.kind === 'otp')?.key ?? ''] ?? ''),
            ).length === 6
              ? [otpButton.key]
              : [],
          ),
          options: Object.fromEntries(
            blueprint.controls
              .filter((c) => c.select && ['MK-19', 'MK-31'].includes(id))
              .map((c) => [
                c.key,
                id === 'MK-31'
                  ? [String(mappedValues[c.key] ?? c.initial)]
                  : c.label === uiText.text_845d1ff8c616
                    ? [c.initial, uiText.text_7f31a6d770e7]
                    : [
                        c.initial,
                        ...(request.draft.teacherUserId ? [uiText.text_cee30389ab2f] : []),
                        uiText.text_1bcd4348116c,
                      ],
              ]),
          ),
          onChange: change,
          onAction: action,
          form: wizard
            ? {
                onSubmit: (event) => {
                  event.preventDefault();
                  const next = blueprint.controls.find(
                    (c) =>
                      c.label.startsWith(uiText.text_f23409bbb176) ||
                      c.label === uiText.text_15dd8091868c,
                  );
                  if (next) action(next);
                },
                submitKeys: new Set(
                  blueprint.controls
                    .filter(
                      (c) =>
                        c.label.startsWith(uiText.text_f23409bbb176) ||
                        c.label === uiText.text_15dd8091868c,
                    )
                    .map((c) => c.key),
                ),
              }
            : undefined,
          text: (text) =>
            id === 'MK-39'
              ? text
                  .replace(
                    uiText.text_a137380f1863,
                    sourceCount.toLocaleString('fa-IR') + uiText.text_971dbc610645,
                  )
                  .replace(
                    uiText.text_83914de105c0,
                    uiText.text_370b22bdbc16 +
                      sourceCount.toLocaleString('fa-IR') +
                      uiText.text_2413fa113cc0,
                  )
              : id === 'MK-31' && (selectedMemberId || changed)
                ? text
                    .replaceAll(uiText.text_9c3669598c7a, member.localName || member.name)
                    .replace(
                      uiText.text_78c58d392054,
                      uiText.text_9727cc8c703c +
                        (member.localName || member.name) +
                        uiText.text_7d06b69aad65,
                    )
                : id === 'MK-26'
                  ? text
                      .replaceAll(
                        uiText.text_9c3669598c7a,
                        inviteTarget?.name ?? uiText.text_593bbf27498e,
                      )
                      .replaceAll('@nazanin.m', '@' + (inviteTarget?.username ?? ''))
                      .replace(
                        uiText.text_f149482b996c,
                        String(values['invite-expiry-label'] ?? uiText.text_f149482b996c),
                      )
                  : (changed || selectedRequestId) && ['MK-18', 'MK-19'].includes(id)
                    ? text.replaceAll(uiText.text_fed0b556b58c, request.draft.title)
                    : changed && protectedClass
                      ? text
                          .replaceAll(uiText.text_fed0b556b58c, currentClass.title)
                          .replaceAll(
                            uiText.text_1f47a215177a,
                            currentClass.teacherUserId
                              ? currentClass.teacherUserId === actor.id
                                ? actor.name
                                : uiText.text_b7a54e700d6f
                              : uiText.text_1f47a215177a,
                          )
                      : text,
        }}
      />
      {id === 'MK-31' && member.userId === currentClass.managerUserId && (
        <p className="mk-scenario-state" role="status">
          {uiText.text_858e81d8ef0c}
        </p>
      )}
      {scenario &&
        !['no-permission', 'session-expired', 'initial-error', 'loading'].includes(scenario) && (
          <div className="mk-scenario-state" role="status">
            {scenario === 'invitation-expired'
              ? uiText.text_415b2ead34f0
              : scenario === 'invitation-revoked'
                ? uiText.text_41bc13de4e46
                : scenario === 'capacity-full'
                  ? uiText.text_8ec748c11fb5
                  : scenario === 'manager-alternative'
                    ? uiText.text_c8222959ba67
                    : scenario === 'membership-rejected'
                      ? uiText.text_ec7914714ab8
                      : scenario === 'membership-cancelled'
                        ? uiText.text_70c3863d5d86
                        : requestLabels[request.status]}
          </div>
        )}
      {notice && (
        <div className="mk-result-notice" role="status">
          <p>{notice}</p>
          <button type="button" aria-label={uiText.text_68681353de04} onClick={() => setNotice('')}>
            {uiText.text_8db71ed28b0f}
          </button>
        </div>
      )}
      <Dialog
        open={!!panel}
        onOpenChange={(open) => {
          if (!open && !busy) setPanel(null);
        }}
      >
        <DialogContent
          title={panel?.title ?? uiText.text_8315dc440d8b}
          description={uiText.text_d3a21a3fb53c}
        >
          {panel?.body}
          {panel?.action && (
            <div className="confirm-actions">
              <Button disabled={busy} onClick={() => void run(panel.action!)}>
                {busy ? uiText.text_b5ef00b1806f : (panel.confirm ?? uiText.text_df535a7ee41d)}
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => setPanel(null)}>
                {uiText.text_fa7af603d430}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
