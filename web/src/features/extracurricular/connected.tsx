'use client';
import '@/features/reference/bundles/features-extracurricular-connected';

import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Search, UsersRound, Mail, ClipboardList, ChevronLeft } from 'lucide-react';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '@/features/personal/provider';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/errors';
import { resolvePersonInput } from '@/features/personal/messaging/directory';
import { draftPrefix } from '@/lib/draft-storage';
import { useViewState } from '@/components/hooks/use-view-state';
import { Field, Pager } from '@/features/personal/school/shared';
import { ConnectionNotice } from '@/components/ui/connection-notice';
import {
  ReferenceScreen,
  referenceNodeKey,
  referenceBlueprint,
  type ReferenceControl,
} from '@/features/reference/screen';
import { FormationList, FormationDetail } from './formation';
import { ClassOverview, ClassInvitationList, ClassManagement } from './class-management';
import { IndependentLearning } from './learning';
import { useClassCommand } from './use-class-command';
import { requestInput, validRequest, requestApi } from './api-model';
import { integration80c as integrationCopy } from '@/content/fa';
import { StaticConnectedFrame, useFrameActions, FrameNotice } from './frame';
import { emptyClassDraft, validateClassDraft, type ClassDraft } from './model';

const base = '/personal/extracurricular';
function useClassDraft() {
  const { session } = usePersonal(),
    key = draftPrefix + 'extracurricular:' + session.user.id;
  const [draft, setDraft] = useState(() => emptyClassDraft(session.user.id)),
    [loaded, setLoaded] = useState(false),
    [storageIssue, setStorageIssue] = useState('');
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (saved?.version === 1 && saved.draft && typeof saved.draft.title === 'string')
        setDraft({
          ...emptyClassDraft(session.user.id),
          ...saved.draft,
          managerUserId: session.user.id,
        });
    } catch {
      setStorageIssue(uiText.text_57716070bbf6);
    }
    setLoaded(true);
  }, [key, session.user.id]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({ version: 1, draft }));
      setStorageIssue('');
    } catch {
      setStorageIssue(uiText.text_90b8655d7cce);
    }
  }, [draft, key, loaded]);
  return { draft, setDraft, loaded, storageIssue };
}
export function ExtracurricularHome({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const [page, setPage] = useState(1);
  const query = usePersonalApi<components['schemas']['PersonalClassPageOfPersonalClassDto']>(
    `/api/v1/personal-classes/page?page=${page}&pageSize=30`,
  );
  const invitations = usePersonalApi<
    components['schemas']['PersonalClassPageOfPersonalClassInvitationDto']
  >('/api/v1/personal-classes/invitations/page?page=1&pageSize=30');
  const frame = useFrameActions('/personal/education'),
    { draft } = useClassDraft(),
    { session } = usePersonal();
  const memory =
    draftPrefix + 'view:' + session.user.id + ':' + session.revision + ':extracurricular:';
  const [search, setSearch] = useViewState(
      memory + 'search',
      '',
      (v): v is string => typeof v === 'string' && v.length <= 200,
    ),
    [filter, setFilter] = useViewState(
      memory + 'filter',
      uiText.text_15270886eadd,
      (v): v is string =>
        typeof v === 'string' &&
        [uiText.text_15270886eadd, uiText.text_740e6f513649, uiText.text_512b7d535f79].includes(v),
    );
  const items = (query.data?.items ?? []).filter(
    (value) =>
      value.title.includes(search.trim()) &&
      (filter === uiText.text_15270886eadd ||
        (filter === uiText.text_512b7d535f79
          ? value.managerUserId === session.user.id
          : value.managerUserId !== session.user.id)),
  );
  const id = query.data?.items.length ? 'MK-11' : 'MK-10';
  const body = (
    <div className="app-body">
      <ConnectionNotice
        cached={!!query.data}
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
      {query.isPending ? (
        <LoadingSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <label className="search">
            <Search size={19} />
            <input
              aria-label={uiText.text_74c3aeacf724}
              placeholder={uiText.text_74c3aeacf724}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="seg" role="group" aria-label={uiText.text_80c38e90f3ff}>
            {[uiText.text_15270886eadd, uiText.text_740e6f513649, uiText.text_512b7d535f79].map(
              (name) => (
                <button
                  key={name}
                  className={filter === name ? 'on' : ''}
                  onClick={() => setFilter(name)}
                >
                  {name}
                </button>
              ),
            )}
          </div>
          {!items.length ? (
            <div className="empty">
              <div className="empty-mark">
                <UsersRound />
              </div>
              <h3>
                {search
                  ? uiText.text_4a9ad5d23452
                  : query.data?.items.length
                    ? uiText.text_00d537cc94bc
                    : uiText.text_699f8b35061e}
              </h3>
              <p>{search ? uiText.text_e33b10d290c6 : uiText.text_556de397362b}</p>
              {search && (
                <button className="btn secondary" onClick={() => setSearch('')}>
                  {uiText.text_35c84a68f506}
                </button>
              )}
            </div>
          ) : (
            items.map((value) => (
              <div key={value.id} className={'card ' + (!value.archived ? 'hero' : '')}>
                <div className="between">
                  <span className="overline">
                    {uiText.text_01d42f321cf0}
                    {value.managerUserId === session.user.id
                      ? uiText.text_d047c7316e02
                      : uiText.text_740e6f513649}
                  </span>
                  <span className={'badge ' + (value.archived ? 'neutral' : '')}>
                    {value.archived ? uiText.text_9defd77e1a5d : uiText.text_a3fa2a3ffcb9}
                  </span>
                </div>
                <Link href={`${base}/classes/${value.id}`}>
                  <h3>{value.title}</h3>
                </Link>
                <p>
                  {value.capabilities?.canAuthorAssignments || value.capabilities?.canAuthorExams
                    ? uiText.text_763a7141dfea
                    : uiText.text_8a15f3eba711}
                </p>
                <Link className="text-action" href={`${base}/classes/${value.id}`}>
                  {uiText.text_d77e2ea74d81}
                  <ChevronLeft size={16} />
                </Link>
              </div>
            ))
          )}
          {query.data && <Pager page={page} total={query.data.totalCount} onChange={setPage} />}
          <div className="list">
            <Link className="row" href={`${base}/requests`}>
              <span className="tile-icon">
                <ClipboardList />
              </span>
              <span className="grow">
                <h4>{uiText.text_7c552fd97407}</h4>
                <p>{draft.title ? uiText.text_d8fc6a9ac464 : uiText.text_f025323df559}</p>
              </span>
              {draft.title && <span className="badge warn">{uiText.text_410c47c7f8b7}</span>}
            </Link>
            <Link className="row" href={`${base}/invitations`}>
              <span className="tile-icon">
                <Mail />
              </span>
              <span className="grow">
                <h4>{uiText.text_ae57af37bd8e}</h4>
                <p>
                  {invitations.isPending
                    ? uiText.text_80516c4adbbe
                    : invitations.isError
                      ? uiText.text_9c0bec309b99
                      : uiText.text_7c8abbb43e1e}
                </p>
              </span>
              {invitations.data?.items.length !== undefined && (
                <span className="badge">
                  {invitations.data.items
                    .filter((x) => x.status === 'Pending')
                    .length.toLocaleString('fa-IR')}
                </span>
              )}
            </Link>
          </div>
          <Link className="btn" href={`${base}/requests/new?step=details`}>
            <Plus size={19} />
            {uiText.text_2d5123fde88c}
          </Link>
          {previewEnabled && (
            <Link className="text-action" href="/preview/reference/MK-11">
              {uiText.text_be28c45ff52d}
            </Link>
          )}
        </>
      )}
    </div>
  );
  return (
    <>
      <ReferenceScreen
        id={id}
        bindings={{
          onAction: frame.action,
          onChange: () => {},
          text: (text) => text.replaceAll(uiText.text_ef48d2bacaf5, frame.name),
          replacements: { [referenceNodeKey(id, 'app-body')!]: body },
        }}
      />
      <FrameNotice message={frame.notice} close={() => frame.setNotice('')} />
    </>
  );
}
const draftFields: Record<string, keyof ClassDraft> = {
  [uiText.text_e5199f5b6d80]: 'title',
  [uiText.text_c64ac820d916]: 'description',
  موضوع: 'subject',
};
export function ClassRequestWizard({
  step = 'details',
  previewEnabled = false,
}: {
  step?: string;
  previewEnabled?: boolean;
}) {
  const frame = useFrameActions(base + '/requests'),
    { draft, setDraft, loaded, storageIssue } = useClassDraft();
  const command = useClassCommand('formation-create');
  const { call } = usePersonal();
  const [teacherOpen, setTeacherOpen] = useState(false),
    [teacherInput, setTeacherInput] = useState(''),
    [teacherBusy, setTeacherBusy] = useState(false),
    [teacherError, setTeacherError] = useState<unknown>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function saveRequest() {
    const details = requestInput(draft);
    if (!validRequest(details)) {
      frame.setNotice(integrationCopy.incomplete);
      return;
    }
    const result = await command.run<components['schemas']['PersonalClassRequestDto']>(
      requestApi,
      { details },
      { idempotent: true },
    );
    if (result) frame.router.push(`${base}/requests/${result.value.id}`);
  }
  const id =
    step === 'audience'
      ? 'MK-14'
      : step === 'management'
        ? 'MK-15'
        : step === 'review'
          ? 'MK-16'
          : 'MK-13';
  const blueprint = referenceBlueprint(id),
    fields = blueprint.controls.filter((c) => c.kind === 'field');
  const values: Record<string, string | boolean> = {};
  const fieldKey = (control: ReferenceControl): keyof ClassDraft | undefined =>
    id === 'MK-14'
      ? (['level', 'capacity', 'admission'] as const)[
          fields.findIndex((c) => c.key === control.key)
        ]
      : draftFields[control.label];
  fields.forEach((control) => {
    const field = fieldKey(control);
    if (field) values[control.key] = String(draft[field]);
  });
  blueprint.controls
    .filter((c) => c.kind === 'check')
    .forEach(
      (c, index) =>
        (values[c.key] =
          id === 'MK-14'
            ? index === 0
              ? draft.allowInvites
              : draft.allowRequests
            : draft.acceptedRules),
    );
  blueprint.controls
    .filter((c) => c.kind === 'radio')
    .forEach(
      (c, index) => (values[c.key] = index === 0 ? !draft.teacherUserId : !!draft.teacherUserId),
    );
  function change(control: ReferenceControl, value: string | boolean) {
    const field = fieldKey(control);
    if (control.kind === 'field' && field) setDraft((old) => ({ ...old, [field]: String(value) }));
    else if (control.kind === 'check') {
      const checks = blueprint.controls.filter((c) => c.kind === 'check');
      const field =
        id === 'MK-14'
          ? checks[0].key === control.key
            ? 'allowInvites'
            : 'allowRequests'
          : 'acceptedRules';
      setDraft((old) => ({ ...old, [field]: !!value }));
    } else if (control.kind === 'radio') {
      if (control.label.includes(uiText.text_88cbbb8ed56e))
        setDraft((old) => ({ ...old, teacherUserId: '' }));
      else {
        setTeacherError(undefined);
        setTeacherOpen(true);
      }
    }
    setErrors((old) => ({ ...old, [control.key]: '' }));
  }
  function next(target: string, current: 'details' | 'audience' | 'management') {
    const issues = validateClassDraft(draft, current);
    setErrors(Object.fromEntries(fields.map((c) => [c.key, issues[fieldKey(c)!] ?? ''])));
    if (Object.keys(issues).length) return;
    frame.router.push(`${base}/requests/new?step=${target}`);
  }
  function action(control: ReferenceControl) {
    if (control.label.includes(uiText.text_3586930232f0)) {
      next('audience', 'details');
      return;
    }
    if (control.label.includes(uiText.text_130ae140b938)) {
      next('management', 'audience');
      return;
    }
    if (control.label.includes(uiText.text_4f08edebcd83)) {
      next('review', 'management');
      return;
    }
    if (control.label.includes(uiText.text_7701570756c1)) {
      frame.router.push(`${base}/requests/new?step=details`);
      return;
    }
    if (control.label.includes(uiText.text_15dd8091868c)) {
      void saveRequest();
      return;
    }
    if (control.label === uiText.common_back && id !== 'MK-13') {
      frame.router.push(
        `${base}/requests/new?step=${id === 'MK-14' ? 'details' : id === 'MK-15' ? 'audience' : 'management'}`,
      );
      return;
    }
    frame.action(control);
  }
  const submitKey = blueprint.controls.find((c) => c.label === uiText.text_15dd8091868c)?.key;
  const footer =
    id === 'MK-16' ? (
      <div className="fixed-actions">
        <div className="stack" style={{ maxWidth: 700, width: '100%' }}>
          <p className="small muted">{integrationCopy.formationHint}</p>
          {command.feedback}
          <button
            className="btn"
            type="button"
            disabled={command.busy || !draft.acceptedRules}
            onClick={() => void saveRequest()}
          >
            {integrationCopy.draft}
          </button>
          {previewEnabled && (
            <Link className="text-action" href="/preview/reference/MK-16">
              {uiText.text_cd28da707b85}
            </Link>
          )}
        </div>
      </div>
    ) : undefined;
  if (!loaded)
    return (
      <div className="bootstrap">
        <LoadingSkeleton />
      </div>
    );
  const replacements: Record<string, ReactNode> = {};
  if (footer) replacements[referenceNodeKey(id, 'fixed-actions')!] = footer;
  if (id === 'MK-16')
    replacements[referenceNodeKey(id, 'card')!] = (
      <div className="card">
        <h3>{draft.title}</h3>
        <p>{draft.description}</p>
        {[
          [uiText.text_5b5353ab5636, draft.level],
          [uiText.text_3a6f00dc84e1, draft.capacity + uiText.text_56bfaedd15bf],
          [uiText.text_005d2e7ec4f6, frame.name + uiText.text_6ccb9cac366e],
          [
            uiText.text_2000c11f322c,
            draft.teacherUserId ? uiText.text_b7a54e700d6f : uiText.text_1f47a215177a,
          ],
          [uiText.text_e5e36e24f2b7, uiText.text_2f6da63d1098],
        ].map(([title, value]) => (
          <div className="kv" key={title}>
            <span className="key">{title}</span>
            <span className="val">{value}</span>
          </div>
        ))}
        <button
          className="text-action"
          type="button"
          onClick={() => frame.router.push(`${base}/requests/new?step=details`)}
        >
          {uiText.text_7701570756c1}
        </button>
      </div>
    );
  return (
    <>
      <ReferenceScreen
        id={id}
        bindings={{
          values,
          errors,
          onAction: action,
          form: {
            onSubmit: (event) => {
              event.preventDefault();
              const next = blueprint.controls.find((c) =>
                c.label.startsWith(uiText.text_f23409bbb176),
              );
              if (next) action(next);
            },
            submitKeys: new Set(
              blueprint.controls
                .filter((c) => c.label.startsWith(uiText.text_f23409bbb176))
                .map((c) => c.key),
            ),
          },
          onChange: change,
          disabled: new Set(command.busy && submitKey ? [submitKey] : []),
          options: Object.fromEntries(
            fields
              .filter((c) => c.select)
              .map((c) => [
                c.key,
                [
                  '',
                  uiText.text_1868e63faf08,
                  uiText.text_06db7e799b6e,
                  uiText.text_23d18d9b76c5,
                  uiText.text_edd0aba98b4e,
                  uiText.text_f709f06f93c6,
                ],
              ]),
          ),
          replacements,
          text: (text) =>
            text
              .replaceAll(uiText.text_ef48d2bacaf5, frame.name)
              .replaceAll(uiText.text_fed0b556b58c, draft.title || uiText.text_e5199f5b6d80)
              .replaceAll(uiText.text_1868e63faf08, draft.subject || uiText.text_23b08487814d)
              .replace(uiText.text_9de05f2d93cf, draft.level || uiText.text_94ae36568e14)
              .replace(uiText.text_0f008bc0b4c3, draft.capacity + uiText.text_56bfaedd15bf)
              .replace(uiText.text_c2e13662ab6a, draft.description)
              .replace(
                uiText.text_3f66d1efa564,
                draft.description.length.toLocaleString('fa-IR') + uiText.text_c3e146dab247,
              ),
        }}
      />
      <FrameNotice message={frame.notice || storageIssue} close={() => frame.setNotice('')} />
      <Dialog open={teacherOpen} onOpenChange={setTeacherOpen}>
        <DialogContent title={integrationCopy.chooseTeacher}>
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              if (teacherBusy) return;
              setTeacherBusy(true);
              setTeacherError(undefined);
              try {
                const result = await call<components['schemas']['PeopleResolveResult']>(
                  '/api/v1/people/resolve',
                  { method: 'POST', body: JSON.stringify(resolvePersonInput(teacherInput)) },
                );
                if (!result.isDiscoverable || !result.profile) throw new ApiError(404);
                setDraft((old) => ({ ...old, teacherUserId: result.profile!.userId }));
                setTeacherOpen(false);
              } catch (error) {
                setTeacherError(error);
              } finally {
                setTeacherBusy(false);
              }
            }}
          >
            <p>{integrationCopy.teacherProposal}</p>
            <Field label={integrationCopy.target}>
              <input
                required
                value={teacherInput}
                onChange={(event) => setTeacherInput(event.target.value)}
              />
            </Field>
            <Button disabled={teacherBusy}>{integrationCopy.chooseTeacher}</Button>
            {!!teacherError && <ErrorState error={teacherError} />}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function FormationRequests() {
  return <FormationList />;
}
export function ConnectedClassDetail({ id }: { id: string }) {
  return <ClassOverview id={id} />;
}
export function ConnectedClassInvitations() {
  return <ClassInvitationList />;
}
export function ClassLifecyclePending({
  previewEnabled = false,
  screen = 'MK-20',
}: {
  previewEnabled?: boolean;
  screen?: string;
}) {
  return (
    <StaticConnectedFrame id={screen} title={uiText.text_a0d568059d0c}>
      <div className="alert warn">{uiText.text_d896a143e687}</div>
      <Link className="btn secondary" href={base}>
        {uiText.text_ac06972caa41}
      </Link>
      {previewEnabled && (
        <Link className="text-action" href={'/preview/reference/' + screen}>
          {uiText.text_ad6bbe672bda}
        </Link>
      )}
    </StaticConnectedFrame>
  );
}
export function ExtracurricularRoute({
  section,
  step,
  previewEnabled = false,
}: {
  section: string[];
  step?: string;
  previewEnabled?: boolean;
}) {
  const [area, id, action] = section;
  if (area === 'requests' && id === 'new')
    return <ClassRequestWizard step={step} previewEnabled={previewEnabled} />;
  if (area === 'requests' && !id) return <FormationRequests />;
  if (area === 'invitations' && !id) return <ConnectedClassInvitations />;
  if (area === 'classes' && id && !action) return <ConnectedClassDetail id={id} />;
  if (area === 'requests' && id) return <FormationDetail id={id} editing={action === 'edit'} />;
  if (area === 'invitations' && id) return <ClassInvitationList id={id} />;
  if (area === 'join') return <ClassManagement id={id} section="join" />;
  if (
    area === 'classes' &&
    ['learning', 'assignments', 'exams', 'submissions', 'exam-submissions', 'evaluations'].includes(
      action,
    )
  )
    return <IndependentLearning classId={id} section={section.slice(2)} />;
  if (area === 'classes' && id)
    return <ClassManagement id={id} section={action} memberId={section[3]} />;
  const screen =
    area === 'requests'
      ? 'MK-18'
      : area === 'invitations'
        ? 'MK-27'
        : area === 'join'
          ? 'MK-28'
          : action === 'members'
            ? section[3]
              ? 'MK-31'
              : 'MK-30'
            : action === 'requests'
              ? 'MK-29'
              : action === 'invite'
                ? 'MK-26'
                : action === 'learning'
                  ? 'MK-44'
                  : action === 'assignments'
                    ? 'MK-45'
                    : action === 'exams'
                      ? 'MK-66'
                      : action === 'info'
                        ? 'MK-34'
                        : action === 'group'
                          ? 'MK-32'
                          : action === 'channel'
                            ? 'MK-33'
                            : action === 'archive'
                              ? 'MK-25'
                              : action === 'edit'
                                ? 'MK-55'
                                : 'MK-20';
  return <ClassLifecyclePending screen={screen} previewEnabled={previewEnabled} />;
}
