'use client';
import '@/features/reference/bundles/features-reference-education-preview';

import * as uiText from '@/content/fa';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Clock } from 'lucide-react';
import {
  ReferenceScreen,
  referenceBlueprint,
  referenceNodeKey,
  referenceTextParentKey,
  type ReferenceControl,
} from './screen';
import {
  PreviewEducationService,
  sampleEducationState,
  educationNumber,
  canDesignEducation,
  canEvaluateEducation,
  type EducationState,
  type EducationActor,
} from '@/features/extracurricular/education-model';
import './education-preview.css';

export const educationPreviewIds = [
  'MK-44',
  'MK-45',
  'MK-46',
  ...Array.from({ length: 23 }, (_, i) => 'MK-' + (60 + i)),
];
type BlueprintNode = Exclude<ReturnType<typeof referenceBlueprint>['tree'], string>;
function nodeList(node: BlueprintNode | string): BlueprintNode[] {
  return typeof node === 'string' ? [] : [node, ...node.children.flatMap(nodeList)];
}
function nodeText(node: BlueprintNode | string): string {
  return typeof node === 'string' ? node : node.children.map(nodeText).join('');
}
const storageKey = 'makan-reference-education-v2';
const staffViews = new Set([
  'MK-60',
  'MK-61',
  'MK-62',
  'MK-64',
  'MK-69',
  'MK-70',
  'MK-71',
  'MK-75',
  'MK-76',
  'MK-81',
  'MK-82',
]);
const evaluatorViews = new Set(['MK-62', 'MK-64', 'MK-75', 'MK-76']);
export function EducationPreview({ id }: { id: string }) {
  const router = useRouter(),
    blueprint = referenceBlueprint(id);
  const [state, setState] = useState<EducationState>(sampleEducationState);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [ready, setReady] = useState(false),
    [notice, setNotice] = useState('');
  const [question, setQuestion] = useState(2),
    [filter, setFilter] = useState(uiText.text_15270886eadd);
  const [online, setOnline] = useState(id !== 'MK-78'),
    [remaining, setRemaining] = useState<number | null>(null);
  const [panel, setPanel] = useState<{
    title: string;
    body: ReactNode;
    action?: () => void;
    confirm?: string;
  } | null>(null);
  const [actor, setActor] = useState<EducationActor>({
    userId: 'preview-account',
    active: true,
    roles: staffViews.has(id) ? ['Manager'] : ['Learner'],
    capabilities: staffViews.has(id) ? ['DesignEducation', 'EvaluateEducation'] : [],
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const start = useRef(Date.now());
  const clock = () => Date.parse('2026-11-02T14:30:00Z') + Date.now() - start.current;
  function persist(next: EducationState) {
    stateRef.current = next;
    setState(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }
  const service = new PreviewEducationService(actor, state, persist, clock);
  const navigate = (to: string) => router.push('/preview/reference/' + to);
  useEffect(() => {
    const scenario = new URL(location.href).searchParams.get('scenario');
    let initial = sampleEducationState();
    try {
      const epoch = Number(sessionStorage.getItem(storageKey + ':clock'));
      if (epoch > 0) start.current = epoch;
      else sessionStorage.setItem(storageKey + ':clock', String(start.current));
    } catch {}
    try {
      const raw = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (raw?.version === 2) initial = raw;
      else if (id === 'MK-65') initial.assignmentGrade.published = true;
      else if (id === 'MK-74' || id === 'MK-77') initial.examGrade.published = true;
    } catch {}
    if ((id === 'MK-68' || id === 'MK-78') && initial.attempt.startedAt === null) {
      initial.attempt.startedAt = clock();
      initial.attempt.deadline = clock() + (id === 'MK-78' ? 492 : 522) * 1000;
      if (id === 'MK-78') initial.attempt.pending = { q3: '1' };
    }
    if (scenario === 'archived') initial.archived = true;
    if (scenario === 'unpublished-result') initial.examGrade.published = false;
    if (id === 'MK-76' && !initial.examGrade.published) initial.examGrade.published = true;
    setState(initial);
    stateRef.current = initial;
    if (scenario === 'manager-no-education')
      setActor({ userId: 'preview-account', active: true, roles: ['Manager'], capabilities: [] });
    if (id === 'MK-79' || scenario === 'revoked') setActor((a) => ({ ...a, active: false }));
    if (scenario === 'teacher')
      setActor({ userId: 'preview-account', active: true, roles: ['Teacher'], capabilities: [] });
    const fields: Record<string, string | boolean> = {};
    for (const control of blueprint.controls) {
      if (control.kind === 'field') fields[control.key] = control.initial;
      if (control.kind === 'radio') fields[control.key] = control.checked;
      if (control.kind === 'check') fields[control.key] = false;
    }
    const presets: Record<string, string> =
      id === 'MK-64'
        ? {
            [uiText.text_e02cc8ce685e]: String(initial.assignmentGrade.score),
            [uiText.text_2fcd080bebd3]: initial.assignmentGrade.feedback,
            [uiText.text_f5603f353dad]: initial.assignmentGrade.privateNote,
          }
        : id === 'MK-75'
          ? {
              [uiText.text_0a4195fe5ad4]: String(initial.examGrade.score - 12),
              [uiText.text_d6732b5fe9fe]: initial.examGrade.feedback,
            }
          : id === 'MK-60'
            ? {
                [uiText.text_c864088e1061]: initial.assignment.title,
                [uiText.text_7647e0a413cb]: initial.assignment.description,
                [uiText.text_b0d05ff19b4c]: String(initial.assignment.total),
                [uiText.text_77c5794c5287]:
                  String(initial.assignment.attempts) + uiText.text_c23a4b046c4e,
              }
            : id === 'MK-69'
              ? {
                  [uiText.text_981230e1e35e]: initial.exam.title,
                  [uiText.text_f50797500bdb]: initial.exam.description,
                  [uiText.text_e14ec3060be7]:
                    String(initial.exam.minutes) + uiText.text_5e2c83ade19c,
                }
              : {};
    for (const c of blueprint.controls)
      if (c.kind === 'field' && presets[c.label] !== undefined) fields[c.key] = presets[c.label];
    if (id === 'MK-46')
      fields[blueprint.controls.find((c) => c.kind === 'field')!.key] = initial.response.text;
    try {
      const index = Number(sessionStorage.getItem(storageKey + ':question'));
      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < initial.exam.questions.length &&
        sessionStorage.getItem(storageKey + ':question') !== null
      ) {
        setQuestion(index);
        if (id === 'MK-70' || id === 'MK-82') {
          const q = initial.exam.questions[index];
          for (const c of blueprint.controls) {
            if (c.label === uiText.text_7c2a05b3d364) fields[c.key] = q.prompt;
            if (c.label === uiText.text_5d5e0005bb46 || c.label === uiText.text_68b3f07a4785)
              fields[c.key] = String(q.points);
            if (c.label === uiText.text_2a3c31e91c68)
              fields[c.key] =
                q.type === 'text' ? uiText.text_65f21708171c : uiText.text_16b1c6d84384;
          }
          blueprint.controls
            .filter((c) => c.kind === 'radio')
            .forEach((c, i) => (fields[c.key] = q.type === 'choice' && i === q.correct));
        }
      }
    } catch {}
    setValues(fields);
    setReady(true);
    // A sample reference view can be opened directly; active attempt actions still require Start.
  }, [id, blueprint]);
  useEffect(() => {
    if (!ready || state.attempt.deadline === null || state.attempt.submitted) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((state.attempt.deadline! - clock()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [ready, state.attempt.deadline, state.attempt.submitted]);
  function run(action: () => void) {
    try {
      action();
      setPanel(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : uiText.text_1d841a8fd1ca);
    }
  }
  function field(label: string) {
    const c = blueprint.controls.find((c) => c.kind === 'field' && c.label === label);
    return c ? String(values[c.key] ?? c.initial) : '';
  }
  function checked() {
    return blueprint.controls
      .filter((c) => c.kind === 'check')
      .every((c) => values[c.key] === true);
  }
  function selectQuestion(index: number) {
    setQuestion(index);
    try {
      sessionStorage.setItem(storageKey + ':question', String(index));
    } catch {}
    const q = stateRef.current.exam.questions[index];
    setValues((old) => {
      const next = { ...old };
      for (const c of blueprint.controls) {
        if (c.label === uiText.text_7c2a05b3d364) next[c.key] = q.prompt;
        if (c.label === uiText.text_5d5e0005bb46 || c.label === uiText.text_68b3f07a4785)
          next[c.key] = String(q.points);
        if (c.label === uiText.text_2a3c31e91c68)
          next[c.key] = q.type === 'text' ? uiText.text_65f21708171c : uiText.text_16b1c6d84384;
      }
      blueprint.controls
        .filter((c) => c.kind === 'radio')
        .forEach((c, i) => (next[c.key] = q.type === 'choice' && i === q.correct));
      return next;
    });
  }
  function currentGrade() {
    if (id === 'MK-64')
      return {
        score: educationNumber(field(uiText.text_e02cc8ce685e)),
        feedback: field(uiText.text_2fcd080bebd3),
        note: field(uiText.text_f5603f353dad),
      };
    return {
      score: 12 + educationNumber(field(uiText.text_0a4195fe5ad4)),
      feedback: field(uiText.text_d6732b5fe9fe),
      note: '',
    };
  }
  function saveGrade() {
    const g = currentGrade();
    service.saveGrade(id === 'MK-64' ? 'assignment' : 'exam', g.score, g.feedback, g.note);
  }
  function change(c: ReferenceControl, value: string | boolean) {
    const next = { ...values, [c.key]: value };
    if (c.kind === 'radio')
      for (const radio of blueprint.controls.filter((x) => x.kind === 'radio'))
        next[radio.key] = radio.key === c.key;
    setValues(next);
    setNotice('');
    if (id === 'MK-46' && c.label === uiText.text_0bcc7208de82)
      run(() => service.saveResponse(String(value), state.response.files));
    if (c.kind === 'upload') {
      const name = String(value).split(' · ')[0];
      if (!/\.(pdf|jpe?g|png|webp)$/i.test(name)) {
        setNotice(uiText.text_8b5cd36eb063);
        return;
      }
      run(() => {
        service.saveResponse(state.response.text, [
          ...state.response.files.filter((x) => x !== name),
          name,
        ]);
        setNotice(uiText.text_83915b846d7f);
      });
    }
    if (['MK-68', 'MK-78'].includes(id) && c.kind === 'radio') {
      const radios = blueprint.controls.filter((x) => x.kind === 'radio');
      run(() => {
        service.saveAnswer(
          state.exam.questions[question]?.id ?? 'q3',
          String(radios.findIndex((x) => x.key === c.key)),
          online,
        );
        setNotice(online ? uiText.text_37633df50279 : uiText.text_b5312bb583c9);
      });
    }
  }
  function action(c: ReferenceControl) {
    const label = c.label;
    if (label === uiText.common_back) {
      navigate(
        id === 'MK-46'
          ? 'MK-45'
          : id === 'MK-68'
            ? 'MK-67'
            : id === 'MK-82'
              ? 'MK-81'
              : id === 'MK-61'
                ? 'MK-60'
                : 'MK-23',
      );
      return;
    }
    const destinations: Record<string, string> = {
      [uiText.text_ca3c4420b9b8]: 'MK-23',
      تکلیف‌ها: 'MK-44',
      آزمون‌ها: 'MK-66',
      اعضا: 'MK-30',
      اطلاعات: 'MK-34',
      [uiText.text_663cca42d122]: 'MK-34',
      آموزشگاه: 'MK-04',
      فوق‌برنامه: 'MK-11',
      دستیار: 'MK-38',
      پروفایل: 'MK-47',
      تنظیمات: 'MK-48',
      [uiText.text_08ca6c6d28a0]: 'MK-46',
      [uiText.text_d06ede345521]: 'MK-60',
      [uiText.text_7dabefaf145f]: 'MK-69',
      [uiText.text_0d12062fab6e]: 'MK-64',
      [uiText.text_e91ccbf5bfd5]: 'MK-64',
      [uiText.text_fcd463dc3c89]: 'MK-67',
      [uiText.text_2e121310e13f]: 'MK-44',
      [uiText.text_2a9639fad252]: 'MK-66',
      [uiText.text_0fd4b87e90b2]: 'MK-23',
      [uiText.text_ac06972caa41]: 'MK-11',
    };
    if (destinations[label]) {
      navigate(destinations[label]);
      return;
    }
    if (label.startsWith(uiText.navigation_messages)) {
      navigate('MK-35');
      return;
    }
    if (label.includes(uiText.text_2226ed46e579)) {
      navigate('MK-32');
      return;
    }
    if (label.includes(uiText.text_5011c7a1dedf)) {
      navigate('MK-33');
      return;
    }
    if (id === 'MK-44' && c.classes.includes('row')) {
      navigate(
        label.includes(uiText.text_36d9273115a0)
          ? 'MK-65'
          : label.includes(uiText.text_cfea4dfbd384)
            ? 'MK-63'
            : 'MK-45',
      );
      return;
    }
    if (
      ['MK-44', 'MK-62', 'MK-66', 'MK-81'].includes(id) &&
      [
        uiText.text_15270886eadd,
        uiText.text_563c95d1f5ea,
        uiText.text_e9dd62f96636,
        uiText.text_5679720a3e4d,
        uiText.text_846e3092b049,
        uiText.text_b8915697a307,
        uiText.text_fe4c80e49640,
      ].includes(label)
    ) {
      setFilter(label);
      return;
    }
    if (id === 'MK-60' && label.startsWith(uiText.text_4c1f73ed8563)) {
      run(() => {
        service.saveAssignment({
          ...state.assignment,
          title: field(uiText.text_c864088e1061),
          description: field(uiText.text_7647e0a413cb),
          total: educationNumber(field(uiText.text_b0d05ff19b4c)),
          attempts: educationNumber(field(uiText.text_77c5794c5287)),
          dueAt:
            field(uiText.text_2b26e703adf2) === uiText.text_e1de3dede3f0
              ? state.assignment.dueAt
              : field(uiText.text_2b26e703adf2),
        });
        navigate('MK-61');
      });
      return;
    }
    if (id === 'MK-61' && label.startsWith(uiText.text_88aa24abe317)) {
      run(() => {
        service.publishAssignment(checked());
        setNotice(uiText.text_b819e3fc929e);
        navigate('MK-81');
      });
      return;
    }
    if (label === uiText.text_e85bd3d1815d) {
      run(() => service.saveResponse(state.response.text, []));
      return;
    }
    if (id === 'MK-46' && label === uiText.text_ef1a5827932d) {
      if (!checked()) {
        setNotice(uiText.text_92c764a5f0b0);
        return;
      }
      setPanel({
        title: uiText.text_c23c4af7833f,
        body: (
          <div>
            <p>{state.response.text}</p>
            <p>{state.response.files.join(uiText.text_11735aabd336) || uiText.text_301597724711}</p>
          </div>
        ),
        confirm: uiText.text_43ac64d2338e,
        action: () => {
          service.submitResponse(true);
          navigate('MK-63');
        },
      });
      return;
    }
    if (id === 'MK-62' && c.classes.includes('row')) {
      navigate('MK-64');
      return;
    }
    if ((id === 'MK-64' || id === 'MK-75') && label.startsWith(uiText.text_8cfe257aece4)) {
      run(() => {
        saveGrade();
        setNotice(uiText.text_e79bae483df1);
      });
      return;
    }
    if ((id === 'MK-64' || id === 'MK-75') && label === uiText.text_c043e6249e9d) {
      try {
        saveGrade();
        const g = currentGrade();
        setPanel({
          title: uiText.text_c043e6249e9d,
          body: (
            <>
              <p>
                {uiText.text_c175d95ab3ec}
                {g.score.toLocaleString('fa-IR')}
              </p>
              <p>{g.feedback}</p>
              <p>{uiText.text_af9e885bc552}</p>
            </>
          ),
          confirm: uiText.text_6337051ced5b,
          action: () => {
            service.publishGrade(id === 'MK-64' ? 'assignment' : 'exam');
            navigate(id === 'MK-64' ? 'MK-65' : 'MK-74');
          },
        });
      } catch (e) {
        setNotice((e as Error).message);
      }
      return;
    }
    if (id === 'MK-69' && label.startsWith(uiText.text_4c1f73ed8563)) {
      run(() => {
        service.saveExam({
          title: field(uiText.text_981230e1e35e),
          description: field(uiText.text_f50797500bdb),
          minutes: educationNumber(field(uiText.text_e14ec3060be7)),
        });
        navigate('MK-70');
      });
      return;
    }
    if ((id === 'MK-70' || id === 'MK-82') && label === uiText.text_289a78168f49) {
      run(() => {
        const q = state.exam.questions[question];
        const selected = blueprint.controls
          .filter((x) => x.kind === 'radio')
          .findIndex((x) => values[x.key]);
        service.saveQuestion({
          ...q,
          prompt: field(uiText.text_7c2a05b3d364),
          points: educationNumber(
            field(id === 'MK-70' ? uiText.text_68b3f07a4785 : uiText.text_5d5e0005bb46),
          ),
          correct: selected < 0 ? q.correct : selected,
        });
        setNotice(uiText.text_384ed2e7a5d3);
        if (id === 'MK-70') navigate('MK-71');
      });
      return;
    }
    if (label === uiText.text_8f78599518cf) {
      setPanel({
        title: uiText.text_8f78599518cf,
        body: <p>{uiText.text_580961ea80cc}</p>,
        confirm: uiText.text_2d2f82490e30,
        action: () => {
          const index = state.exam.questions.length;
          service.saveQuestion({
            id: 'q' + (index + 1),
            prompt: uiText.text_940f3bf6347d,
            type: 'text',
            points: 1,
            options: [],
            correct: 0,
          });
          selectQuestion(index);
          setNotice(uiText.text_cb00238b0512);
        },
      });
      return;
    }
    if (id === 'MK-82' && c.classes.includes('edu-q-item')) {
      const index = blueprint.controls
        .filter((x) => x.classes.includes('edu-q-item'))
        .findIndex((x) => x.key === c.key);
      selectQuestion(index);
      return;
    }
    if (id === 'MK-82' && label === uiText.text_7661c944dc71) {
      navigate('MK-71');
      return;
    }
    if (id === 'MK-71' && label === uiText.text_edec234a5387) {
      run(() => {
        service.publishExam(checked());
        navigate('MK-66');
      });
      return;
    }
    if (label.includes(uiText.text_f05b48dd8b84) || label === uiText.text_b25f7dd3504e) {
      setPanel({
        title: uiText.text_f05b48dd8b84,
        body: (
          <div>
            <h3>{state.exam.title}</h3>
            {state.exam.questions.map((q, i) => (
              <section key={q.id}>
                <h4>
                  {uiText.text_a2c10c627424}
                  {(i + 1).toLocaleString('fa-IR')}
                </h4>
                <p>{q.prompt}</p>
                {q.options.map((o) => (
                  <p key={o}>
                    {uiText.text_ee30219a75cf}
                    {o}
                  </p>
                ))}
              </section>
            ))}
          </div>
        ),
      });
      return;
    }
    if (id === 'MK-67' && label.startsWith(uiText.text_974bdfc23e33)) {
      run(() => {
        service.startExam(checked());
        navigate('MK-68');
      });
      return;
    }
    if (
      id === 'MK-68' &&
      (label === uiText.text_55a4c60d6645 ||
        label === uiText.text_48e82c70aae1 ||
        c.kind === 'questionNumber')
    ) {
      if (state.attempt.startedAt === null) {
        setNotice(uiText.text_5d2fe4e754e4);
        return;
      }
      const number = educationNumber(label);
      selectQuestion(
        Number.isFinite(number)
          ? number - 1
          : Math.max(
              0,
              Math.min(
                state.exam.questions.length - 1,
                question + (label === uiText.text_48e82c70aae1 ? -1 : 1),
              ),
            ),
      );
      return;
    }
    if (id === 'MK-68' && label === uiText.text_3c36b0fe899d) {
      navigate('MK-72');
      return;
    }
    if (id === 'MK-72' && label.startsWith(uiText.text_5e74d68b0cb2)) {
      setPanel({
        title: uiText.text_90522d124187,
        body: (
          <p>
            {(
              state.exam.questions.length - Object.keys(state.attempt.answers).length
            ).toLocaleString('fa-IR')}{' '}
            {uiText.text_ec5f7fc97149}
          </p>
        ),
        confirm: uiText.text_8fc8ae49094b,
        action: () => {
          service.submitExam();
          navigate('MK-73');
        },
      });
      return;
    }
    if (id === 'MK-72' && c.classes.includes('row')) {
      selectQuestion(Math.max(0, educationNumber(label) - 1));
      navigate('MK-68');
      return;
    }
    if (id === 'MK-76' && label === uiText.text_11203e136260) {
      run(() => {
        service.correctGrade(
          educationNumber(field(uiText.text_b2b345228cd7)),
          field(uiText.text_25a9f54e1371),
          checked(),
        );
        navigate('MK-74');
      });
      return;
    }
    if (id === 'MK-78' && label.startsWith(uiText.text_be9b8b4f2b98)) {
      run(() => {
        service.reconnect();
        setOnline(true);
        setNotice(uiText.text_7548f3907b57);
        navigate('MK-68');
      });
      return;
    }
    if (label.includes(uiText.text_cfcf423c1a66) || label === uiText.text_9a45c4c0c591) {
      setPanel({
        title: uiText.text_0a00ca9a86cf,
        body: (
          <div>
            {state.examGrade.history.length ? (
              state.examGrade.history.map((h) => (
                <p key={h.version}>
                  {uiText.text_414034443c02}
                  {h.version.toLocaleString('fa-IR')}
                  {uiText.text_588da4105320}
                  {h.score.toLocaleString('fa-IR')}
                  {uiText.text_78887da22764} {h.reason}
                </p>
              ))
            ) : (
              <p>{uiText.text_7e80472d468f}</p>
            )}
          </div>
        ),
      });
      return;
    }
    if (
      label.includes(uiText.text_3b90dccc67d9) &&
      (label.includes(uiText.text_5e29284308ae) || label.startsWith(uiText.text_d2c8a80d171e))
    ) {
      setPanel({
        title: uiText.text_ad1f6ea76967,
        body:
          id === 'MK-63' || id === 'MK-65' ? (
            <div>
              <p>{state.response.text}</p>
              <p>{state.response.files.join(uiText.text_11735aabd336)}</p>
            </div>
          ) : (
            <div>
              {Object.entries(state.attempt.answers).map(([q, a]) => (
                <p key={q}>
                  {q}
                  {uiText.text_45822f54a0d0}
                  {a}
                </p>
              ))}
            </div>
          ),
      });
      return;
    }
    if (id === 'MK-66' && label.includes(uiText.text_7e224a5bbbbf)) {
      navigate('MK-74');
      return;
    }
    if (label.includes(uiText.text_c8756c7737fc)) {
      setPanel({
        title: uiText.text_c8756c7737fc,
        body: <p>{uiText.text_2fa23dc90f0f}</p>,
      });
      return;
    }
    if (label === uiText.text_16b1c6d84384 || label === uiText.text_65f21708171c) {
      run(() =>
        service.saveQuestion({
          ...state.exam.questions[question],
          type: label === uiText.text_65f21708171c ? 'text' : 'choice',
          options:
            label === uiText.text_65f21708171c
              ? []
              : [uiText.text_fed04080569d, uiText.text_ef70f5a14bb4, uiText.text_02ad5c3a8e98],
        }),
      );
      setFilter(label);
      return;
    }
    setPanel({
      title: label === uiText.text_739d6daf2013 ? uiText.text_81dfaf6f67e4 : label.slice(0, 70),
      body: <p>{uiText.text_1f6086865fec}</p>,
    });
  }
  if (!ready)
    return (
      <p className="bootstrap" role="status">
        {uiText.text_e873b8b4a504}
      </p>
    );
  const denied =
    !actor.active ||
    (staffViews.has(id) &&
      !(evaluatorViews.has(id) ? canEvaluateEducation(actor) : canDesignEducation(actor)));
  if (denied && id !== 'MK-79')
    return (
      <>
        <ReferenceScreen
          id="MK-79"
          preview
          bindings={{ onChange: () => {}, onAction: () => navigate('MK-23') }}
        />
        <p className="mk-result-notice" role="status">
          {actor.active ? uiText.text_17ba8ad33751 : uiText.text_111933baaec5}
        </p>
      </>
    );
  const replacements: Record<string, ReactNode> = {};
  const hidden = new Set<string>();
  const file = referenceNodeKey(id, 'file');
  if (id === 'MK-46' && file && !state.response.files.length) hidden.add(file);
  const list = referenceNodeKey(id, 'edu-list');
  const search = blueprint.controls.find((c) => c.kind === 'search'),
    query = search ? String(values[search.key] ?? '').trim() : '';
  if (
    (filter !== uiText.text_15270886eadd || query) &&
    list &&
    ['MK-44', 'MK-62', 'MK-66'].includes(id)
  ) {
    const rows = blueprint.controls
      .filter((c) => c.classes.split(' ').includes('row'))
      .filter(
        (c) =>
          (!query || c.label.includes(query)) &&
          (filter === uiText.text_15270886eadd ||
            filter === uiText.text_5679720a3e4d ||
            filter === uiText.text_846e3092b049 ||
            (filter === uiText.text_563c95d1f5ea && c.label.includes(uiText.text_563c95d1f5ea)) ||
            (filter === uiText.text_e9dd62f96636 && c.label.includes(uiText.text_878e8ee003b3)) ||
            (filter === uiText.text_b8915697a307 && state.assignmentGrade.published)),
      );
    replacements[list] = (
      <div className="list edu-list">
        {rows.length ? (
          rows.map((c) => (
            <button className="row" key={c.key} onClick={() => action(c)}>
              {c.label}
            </button>
          ))
        ) : (
          <p className="card">{uiText.text_7a4b3c8300f7}</p>
        )}
      </div>
    );
  }
  if (['MK-68', 'MK-78'].includes(id) && state.attempt.startedAt !== null) {
    const timer = referenceNodeKey(id, 'edu-timer');
    if (timer && remaining !== null)
      replacements[timer] = (
        <span
          className={'edu-timer' + (id === 'MK-78' && !online ? ' warning' : '')}
          aria-label={uiText.text_4a181c1b2123}
        >
          <Clock size={16} aria-hidden="true" />
          {Math.floor(remaining / 60).toLocaleString('fa-IR', { minimumIntegerDigits: 2 })}
          {uiText.text_e7ac0786668e}
          {(remaining % 60).toLocaleString('fa-IR', { minimumIntegerDigits: 2 })}
        </span>
      );
    const title = referenceTextParentKey(id, uiText.text_2c9a24584df2);
    if (title)
      replacements[title] = (
        <h3 style={{ fontSize: '1.125rem', lineHeight: 1.9 }}>
          {state.exam.questions[question]?.prompt}
        </h3>
      );
    if (state.exam.questions[question]?.type === 'text') {
      for (const c of blueprint.controls.filter((c) => c.kind === 'quizOption')) hidden.add(c.key);
      const save = referenceNodeKey(id, 'edu-save') ?? referenceNodeKey(id, 'edu-pending');
      if (save)
        replacements[save] = (
          <label className="field">
            {uiText.text_68d25336ed88}
            <textarea
              className="input textarea"
              value={
                state.attempt.pending['q' + (question + 1)] ??
                state.attempt.answers['q' + (question + 1)] ??
                ''
              }
              onChange={(e) =>
                run(() => service.saveAnswer('q' + (question + 1), e.target.value, online))
              }
            />
          </label>
        );
    }
  }
  const classes: Record<string, string> = {};
  const boundValues = { ...values };
  if (['MK-68', 'MK-78', 'MK-70', 'MK-82'].includes(id)) {
    const current = state.exam.questions[question];
    const selected = ['MK-68', 'MK-78'].includes(id)
      ? (state.attempt.pending[current.id] ?? state.attempt.answers[current.id])
      : String(
          blueprint.controls
            .filter((c) => c.kind === 'radio')
            .findIndex((c) => values[c.key] === true),
        );
    blueprint.controls
      .filter((c) => c.kind === 'radio')
      .forEach((c, i) => (boundValues[c.key] = String(i) === selected));
    blueprint.controls
      .filter((c) => c.kind === 'quizOption')
      .forEach((c, i) => {
        classes[c.key] =
          c.classes.replace(/\bselected\b/g, '') + (String(i) === selected ? ' selected' : '');
        if (current.type === 'text') hidden.add(c.key);
      });
  }
  for (const c of blueprint.controls.filter((c) => c.kind === 'questionNumber')) {
    const index = educationNumber(c.label) - 1;
    classes[c.key] =
      index === question ? 'current' : state.attempt.answers['q' + (index + 1)] ? 'done' : '';
  }
  if (id === 'MK-81') {
    const rows = nodeList(blueprint.tree).filter(
      (n) => n.tag === 'tr' && n.children.some((c) => typeof c !== 'string' && c.tag === 'td'),
    );
    rows.forEach((row, index) => {
      const cells = row.children.filter(
          (c): c is BlueprintNode => typeof c !== 'string' && c.tag === 'td',
        ),
        last = cells.at(-1);
      if (!last) return;
      const title = nodeText(cells[0]);
      replacements[last.key] = (
        <td data-label={uiText.text_db358e4e91fa}>
          <button
            className="mk-inline-icon"
            aria-label={uiText.text_f307f4a9a432 + title}
            onClick={() =>
              index === 0
                ? navigate('MK-62')
                : setPanel({
                    title,
                    body: (
                      <div>
                        {cells.slice(1, -1).map((c) => (
                          <p key={c.key}>
                            {c.attrs['data-label']}
                            {uiText.text_45822f54a0d0}
                            {nodeText(c)}
                          </p>
                        ))}
                      </div>
                    ),
                  })
            }
          >
            <ChevronLeft size={20} />
          </button>
        </td>
      );
    });
  }
  if (id === 'MK-82') {
    const questionsKey = referenceNodeKey(id, 'edu-questions');
    if (questionsKey)
      replacements[questionsKey] = (
        <div className="card edu-questions">
          <div className="between">
            <b>{uiText.text_611f12db4095}</b>
            <span className="badge">
              {state.exam.questions.length.toLocaleString('fa-IR')}
              {uiText.text_fe906bfd1d45}
            </span>
          </div>
          {state.exam.questions.map((q, i) => (
            <button
              key={q.id}
              className={'edu-q-item ' + (question === i ? 'on' : '')}
              onClick={() => selectQuestion(i)}
            >
              <b>
                {uiText.text_a2c10c627424}
                {(i + 1).toLocaleString('fa-IR')}
              </b>
              <span>
                {q.type === 'text' ? uiText.text_65f21708171c : uiText.text_29ce8189d270}
                {uiText.text_588da4105320}
                {q.points.toLocaleString('fa-IR')}
                {uiText.text_931d9d5a6b04}
              </span>
            </button>
          ))}
          <button
            className="btn secondary"
            onClick={() => action({ ...blueprint.controls[0], label: uiText.text_8f78599518cf })}
          >
            {uiText.text_8f78599518cf}
          </button>
        </div>
      );
  }
  const bodyKey = referenceNodeKey(id, 'app-body');
  if (['MK-65', 'MK-74', 'MK-77'].includes(id)) {
    const grade = id === 'MK-65' ? state.assignmentGrade : state.examGrade;
    if (!grade.published && bodyKey)
      replacements[bodyKey] = (
        <main className="app-body">
          <div className="card">
            <h3>{uiText.text_993184c04686}</h3>
            <p>{uiText.text_3ad6c9a535c7}</p>
          </div>
        </main>
      );
    else {
      const versionRow = nodeList(blueprint.tree).find(
        (n) =>
          n.attrs.className?.split(' ').includes('kv') &&
          nodeText(n).includes(uiText.text_535062e13830),
      );
      const versionValue = versionRow?.children.find(
        (n): n is BlueprintNode => typeof n !== 'string' && n.attrs.className === 'val',
      );
      if (versionValue)
        replacements[versionValue.key] = (
          <div className="val">{grade.version.toLocaleString('fa-IR')}</div>
        );
      const score = referenceNodeKey(id, 'edu-score');
      if (score)
        replacements[score] = (
          <div className="edu-score">
            <strong>
              {grade.score.toLocaleString('fa-IR')}
              <span>{uiText.text_878e8ee003b3}</span>
            </strong>
            <div>
              <span className="badge">{uiText.text_11d03a8b42a8}</span>
              <p>{uiText.text_4b490ddec2c0}</p>
            </div>
          </div>
        );
      const feedback = referenceTextParentKey(
        id,
        id === 'MK-65' ? uiText.text_eb54241c660d : uiText.text_f2a2e6b84f68,
      );
      if (feedback) replacements[feedback] = <p>{grade.feedback}</p>;
    }
  }
  const text = (value: string) =>
    value
      .replaceAll(uiText.text_79b4dd1f52fa, state.response.receipt ?? uiText.text_3daf367d274e)
      .replaceAll(uiText.text_78ed2cf2e5c5, state.attempt.receipt ?? uiText.text_8cb0071cc206)
      .replaceAll(uiText.text_47e5d96a3e5d, state.response.files[0] ?? uiText.text_301597724711)
      .replaceAll(uiText.text_2dc8c7c23f8a, state.assignment.title)
      .replaceAll(uiText.text_affad8d9215a, state.exam.title)
      .replace(
        uiText.text_913fe5913551,
        uiText.text_61592724878e + (question + 1).toLocaleString('fa-IR'),
      )
      .replace(
        uiText.text_21afaeab809f,
        uiText.format_63f311d97e40(
          (question + 1).toLocaleString('fa-IR'),
          state.exam.questions.length.toLocaleString('fa-IR'),
        ),
      );
  return (
    <>
      <ReferenceScreen
        id={id}
        preview
        bindings={{
          values: boundValues,
          classes,
          hidden,
          replacements,
          text,
          onChange: change,
          onAction: action,
        }}
      />
      {notice && (
        <div className="mk-result-notice" role="status">
          <p>{notice}</p>
          <button onClick={() => setNotice('')} aria-label={uiText.text_68681353de04}>
            {uiText.text_8db71ed28b0f}
          </button>
        </div>
      )}
      <Dialog
        open={!!panel}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent
          title={panel?.title ?? uiText.text_8315dc440d8b}
          description={uiText.text_d58d62c9bdd3}
        >
          {panel?.body}
          {panel?.action && (
            <div className="confirm-actions">
              <Button onClick={() => run(panel.action!)}>
                {panel.confirm ?? uiText.text_45f2d7e2b942}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                {uiText.text_fa7af603d430}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
