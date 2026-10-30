'use client';
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
        title="کلاس‌های آموزشگاه"
        description={
          manage
            ? 'کلاس بسازید، دانش‌آموزان را تقسیم‌بندی کنید و معلمان کلاس را مشخص کنید.'
            : 'کلاس‌های مجاز شما؛ برنامه، تکلیف و آزمون هر کلاس در یک جا.'
        }
        action={
          manage &&
          q.data && (
            <Button asChild>
              <Link href={base + '/classes/new'}>
                <Plus size={19} />
                ایجاد کلاس
              </Link>
            </Button>
          )
        }
      />
      {manage && <SchoolSearch label="جستجوی کلاس، درس یا دوره" onSearch={setSearch} />}
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
                    aria-label={(manage ? 'مدیریت کلاس ' : 'ورود به کلاس ') + item.title}
                  >
                    {manage ? 'مدیریت کلاس' : 'ورود به کلاس'}
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="هنوز کلاسی وجود ندارد"
            description={
              manage
                ? 'از «ایجاد کلاس» شروع کنید؛ سپس دانش‌آموز و معلم را به کلاس اضافه کنید.'
                : 'کلاس‌های اختصاص‌یافته پس از ثبت آموزشگاه اینجا نمایش داده می‌شوند.'
            }
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
          <Link href={`${base}/classes/${classId}/enrollments/new`}>ثبت‌نام دانش‌آموز</Link>
        </Button>
      </>
    );
  return (
    <Card
      title={classId ? 'دانش‌آموزان این کلاس' : 'دانش‌آموزان ثبت‌نام‌شده'}
      action={
        classId && (
          <Button asChild>
            <Link href={`${base}/classes/${classId}/enrollments/new`}>ثبت‌نام دانش‌آموز</Link>
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
                    <th>دانش‌آموز</th>
                    <th>کلاس</th>
                    <th>وضعیت</th>
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
            <EmptyState
              title="ثبت‌نامی وجود ندارد"
              description="پس از ثبت‌نام در کلاس، دانش‌آموز اینجا نمایش داده می‌شود."
            />
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
        title="والدین و دسترسی فرزندان"
        description="دسترسی آموزشی والد فقط برای فرزند مشخص و رابطهٔ فعال برقرار می‌شود."
        action={
          <Button asChild>
            <Link href={base + '/guardians/new'}>
              <UserRoundPlus size={19} />
              افزودن رابطهٔ والد و فرزند
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
              <EmptyState title="رابطهٔ والد و فرزندی ثبت نشده است" />
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
          'پروندهٔ فرزند'}
      </h3>
      <p className={s.hint}>
        حساب والد: <bdi>{r.guardianUserId}</bdi>
      </p>
      <Status>{label(r.status)}</Status>
      {r.status === 'Pending' && (
        <Button
          disabled={a.busy}
          onClick={() =>
            void a.run('/api/v1/organization/guardian-relations/' + r.id + '/activate', {
              expectedRowVersion: r.rowVersion,
              reason: 'فعال‌سازی رابطهٔ بررسی‌شده در آموزشگاه',
            })
          }
        >
          فعال‌سازی دسترسی والد
        </Button>
      )}
      {a.feedback}
      {['Active', 'Pending'].includes(r.status) && (
        <>
          <Field label="دلیل تغییر دسترسی والد">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <ConfirmAction
            disabled={!reason.trim()}
            destructive
            title="پایان دسترسی والد به این فرزند"
            trigger="پایان دسترسی والد"
            confirm="پایان رابطه"
            description="فقط دسترسی آموزشی همین رابطه پایان می‌یابد؛ حساب والد و رابطه با فرزندان دیگر حفظ می‌شود."
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
