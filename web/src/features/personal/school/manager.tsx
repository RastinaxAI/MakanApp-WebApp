'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { BookOpen, Plus, UserRoundPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { ClassRoster, SchoolSearch } from './directory';
import { MemberDirectory } from './member-directory';
import { ManagerClassCards } from './manager-class-cards';
import { ManagerPageHeader } from './manager-page-header';
import s from './school.module.css';
import managerStyle from './manager-workspace.module.css';
import {
  base,
  Card,
  Field,
  Pager,
  SchoolHeading,
  Status,
  useSchoolAction,
  useSchoolCommand,
} from './shared';
type S = components['schemas'];
export function Classes({ manage }: { manage: boolean }) {
  const Heading = manage ? ManagerPageHeader : SchoolHeading;
  const [search, setSearch] = useState('');
  const q = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  return (
    <div className={manage ? managerStyle.stack : undefined}>
      <Heading
        title={uiText.text_6d784fcb7c9a}
        description={manage ? uiText.text_aa9247a0d79f : uiText.text_d5743b840e90}
        action={
          manage &&
          q.data && (
            <Button asChild>
              <Link href={base + '/classes/new'}>
                <Plus size={19} />
                {uiText.text_34aeac5f09b4}
              </Link>
            </Button>
          )
        }
      />
      {manage && <SchoolSearch label={uiText.text_3fce236a7ccd} onSearch={setSearch} />}
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : manage && q.data.length ? (
        <ManagerClassCards
          items={q.data.filter((c) =>
            [c.title, c.courseTitle, c.academicPeriodTitle].some((v) => v.includes(search)),
          )}
        />
      ) : q.data.length ? (
        <div className={s.grid}>
          {q.data.map((item) => (
            <article className={s.classCard} key={item.id}>
              <BookOpen size={30} />
              <h2>{item.title}</h2>
              <p>
                {item.courseTitle}
                <br />
                {item.academicPeriodTitle}
              </p>
              <footer>
                <Status>{label(item.status)}</Status>
                <Button asChild>
                  <Link
                    href={base + '/classes/' + item.id}
                    aria-label={
                      (manage ? uiText.text_ea1397131af1 : uiText.text_535e99805ced) + item.title
                    }
                  >
                    {manage ? uiText.text_5923c5cbace6 : uiText.text_e0c1b3a8ec7a}
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title={uiText.text_aca867e37332}
            description={manage ? uiText.text_f2f08c07a3c0 : uiText.text_bc49db330f23}
          />
        </Card>
      )}
    </div>
  );
}
export { People } from './person-records';
export function Teachers() {
  return <MemberDirectory initialRole="Teacher" />;
}
export function Enrollments({ classId }: { classId?: string }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ReportPageOfManagerEnrollmentReportItem']>(
    `/api/v1/reports/manager/enrollments?PageNumber=${page}&PageSize=30` +
      (classId ? '&ClassId=' + classId : ''),
  );
  if (classId)
    return (
      <>
        <ClassRoster classId={classId} kind="learners" manage />
        <Button asChild>
          <Link href={`${base}/classes/${classId}/enrollments/new`}>
            {uiText.text_e82efffd7b2d}
          </Link>
        </Button>
      </>
    );
  return (
    <Card
      title={classId ? uiText.text_b6f6538e49df : uiText.text_2f6b3c84f920}
      action={
        classId && (
          <Button asChild>
            <Link href={`${base}/classes/${classId}/enrollments/new`}>
              {uiText.text_e82efffd7b2d}
            </Link>
          </Button>
        )
      }
    >
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{uiText.text_fbd179d162db}</th>
                    <th>{uiText.text_56c43e096bb9}</th>
                    <th>{uiText.text_68d7eb08efbc}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((row) => (
                    <tr key={row.enrollmentId}>
                      <td>{row.learnerDisplayName}</td>
                      <td>
                        <Link href={base + '/classes/' + row.classId}>{row.classTitle}</Link>
                      </td>
                      <td>{label(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={uiText.text_763022dc000f} description={uiText.text_fb368cca5abe} />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
export function Guardians() {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['SchoolGuardianRelationsPage']>(
    `/api/v1/organization/guardian-relations?page=${page}&pageSize=30`,
  );
  return (
    <div className={managerStyle.stack}>
      <ManagerPageHeader
        title={uiText.text_836e8b88a455}
        description={uiText.text_a8f7d5d341fb}
        action={
          <Button asChild>
            <Link href={base + '/guardians/new'}>
              <UserRoundPlus size={19} />
              {uiText.text_4984b636db1a}
            </Link>
          </Button>
        }
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card>
            {q.data.items.length ? (
              <div className={s.editorList}>
                {q.data.items.map((r) => (
                  <GuardianRow key={r.id} relation={r} />
                ))}
              </div>
            ) : (
              <EmptyState title={uiText.text_4b50b911a4a4} />
            )}
          </Card>
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </div>
  );
}
function GuardianRow({ relation: r }: { relation: S['SchoolGuardianRelationDto'] }) {
  const person = usePersonalApi<S['OrganizationPersonDto']>(
    '/api/v1/organization/people/' + r.learnerOrganizationPersonId,
  );
  const a = useSchoolAction();
  const command = useSchoolCommand();
  const [reason, setReason] = useState('');
  return (
    <div className={s.question}>
      <h3>
        {person.data?.displayName ||
          [person.data?.firstName, person.data?.lastName].filter(Boolean).join(' ') ||
          uiText.text_b9c23f90e92a}
      </h3>
      <p className={s.hint}>
        {uiText.text_c9c2548db6d8}
        <bdi>{r.guardianUserId}</bdi>
      </p>
      <Status>{label(r.status)}</Status>
      {r.status === 'Pending' && (
        <Button
          disabled={a.busy}
          onClick={() =>
            void a.run('/api/v1/organization/guardian-relations/' + r.id + '/activate', {
              expectedRowVersion: r.rowVersion,
              reason: uiText.text_7d11b416e34f,
            })
          }
        >
          {uiText.text_50591f0957ee}
        </Button>
      )}
      {a.feedback}
      {['Active', 'Pending'].includes(r.status) && (
        <>
          <Field label={uiText.text_94eb9f878b58}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <ConfirmAction
            disabled={!reason.trim()}
            destructive
            title={uiText.text_5fc6fc050d06}
            trigger={uiText.text_67a07cf5da0e}
            confirm={uiText.text_e6a502d4ee2b}
            description={uiText.text_129858da9abc}
            onConfirm={async () => {
              await command(
                `/api/v1/organization/guardian-relations/${r.id}/${r.status === 'Active' ? 'end' : 'revoke'}`,
                { expectedRowVersion: r.rowVersion, reason: reason.trim() },
              );
              return true;
            }}
          />
        </>
      )}
    </div>
  );
}
