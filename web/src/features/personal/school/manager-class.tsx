'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import { PageBack } from '@/components/navigation/page-back';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { ClassRoster } from './directory';
import { ClassPerformance, ReportData } from './manager-reports';
import { Schedule } from './schedule';
import { ClassLessons } from './lessons';
import { base, SchoolHeading } from './shared';
import { OfficialSpaces } from './official-spaces';
import s from './manager-workspace.module.css';
const tabs = [
  ['members', 'معلمان و دانش‌آموزان'],
  ['reports', 'عملکرد کلاس'],
  ['sessions', 'جلسه‌ها'],
  ['lessons', 'جزوه‌ها'],
  ['assessments', 'تکلیف‌ها و آزمون‌ها'],
] as const;
export function ManagerClass({ id }: { id: string }) {
  const { session } = usePersonal();
  const q = usePersonalApi<components['schemas']['ClassResult'][]>('/api/v1/academic/classes');
  const params = useSearchParams(),
    requested = params.get('tab');
  const memberKind = params.get('member') === 'teachers' ? 'teachers' : 'learners';
  const tab = tabs.find(([key]) => key === requested)?.[0] ?? 'members';
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data.find(
    (c) => c.id === id && c.organizationId === session.context.organizationId,
  );
  if (!item) return <ErrorState error={new ApiError(404)} />;
  return (
    <div className={s.stack}>
      <PageBack href={base + '/classes'} />
      <SchoolHeading
        title={item.title}
        description={`${item.courseTitle} · ${item.academicPeriodTitle} · ظرفیت ${item.capacity.toLocaleString('fa-IR')} نفر · ${label(item.status)}`}
      />
      <OfficialSpaces classId={id} />
      <nav className={s.tabs} aria-label="بخش‌های مدیریت کلاس">
        <Link
          href={`${base}/classes/${id}?tab=members`}
          aria-current={tab === 'members' ? 'page' : undefined}
        >
          معلمان و دانش‌آموزان
        </Link>
        <Link
          href={`${base}/classes/${id}?tab=sessions`}
          aria-current={['sessions', 'lessons', 'assessments'].includes(tab) ? 'page' : undefined}
        >
          فعالیت‌های کلاس
        </Link>
        <Link
          href={`${base}/classes/${id}?tab=reports`}
          aria-current={tab === 'reports' ? 'page' : undefined}
        >
          عملکرد کلاس
        </Link>
      </nav>
      {['sessions', 'lessons', 'assessments'].includes(tab) && (
        <nav className={s.tabs} aria-label="فعالیت‌های کلاس">
          {tabs
            .filter(([key]) => ['sessions', 'lessons', 'assessments'].includes(key))
            .map(([key, title]) => (
              <Link
                key={key}
                href={`${base}/classes/${id}?tab=${key}`}
                aria-current={tab === key ? 'page' : undefined}
              >
                {title}
              </Link>
            ))}
        </nav>
      )}
      {tab === 'members' ? (
        <>
          <nav className={s.memberSwitch} aria-label="نوع اعضای کلاس">
            <Link
              href={`${base}/classes/${id}?tab=members&member=learners`}
              aria-current={memberKind === 'learners' ? 'page' : undefined}
            >
              دانش‌آموزان
            </Link>
            <Link
              href={`${base}/classes/${id}?tab=members&member=teachers`}
              aria-current={memberKind === 'teachers' ? 'page' : undefined}
            >
              معلمان
            </Link>
            <Button asChild>
              <Link
                href={`${base}/classes/${id}/${memberKind === 'teachers' ? 'teachers' : 'enrollments'}/new`}
              >
                {memberKind === 'teachers' ? 'افزودن معلم به کلاس' : 'افزودن دانش‌آموز به کلاس'}
              </Link>
            </Button>
          </nav>
          <ClassRoster key={memberKind} classId={id} kind={memberKind} manage />
        </>
      ) : tab === 'reports' ? (
        <ClassPerformance id={id} />
      ) : tab === 'sessions' ? (
        <Schedule classId={id} teach={false} />
      ) : tab === 'lessons' ? (
        <ClassLessons classId={id} teach={false} />
      ) : (
        <ReportData kind="assessments" classId={id} />
      )}
    </div>
  );
}
