'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, ClipboardCheck, GraduationCap, ChartNoAxesCombined } from 'lucide-react';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { usePersonalApi } from '../provider';
import { base, Card, Field, Pager } from './shared';
import { ManagerPageHeader } from './manager-page-header';
import s from './manager-workspace.module.css';
type S = components['schemas'];
const reports = [
  ['teacher-workload', 'کارکرد معلمان', ChartNoAxesCombined],
  ['attendance', 'حضور کلاس‌ها', CalendarCheck],
  ['assessments', 'تکلیف‌ها و آزمون‌ها', ClipboardCheck],
  ['enrollments', 'ثبت‌نام‌ها', GraduationCap],
] as const;
type Kind = (typeof reports)[number][0];
export function ManagerReports() {
  const requested = useSearchParams().get('kind');
  const kind = reports.find(([key]) => key === requested)?.[0] ?? 'teacher-workload';
  const [classId, setClassId] = useState('');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  return (
    <div className={s.stack}>
      <ManagerPageHeader
        title="گزارش‌های آموزشگاه"
        description="کارکرد آموزشی، حضور، ارزیابی و ثبت‌نام را از گزارش‌های آموزشگاه پیگیری کنید."
      />
      <nav className={s.reportTabs} aria-label="نوع گزارش مدیر">
        {reports.map(([key, title, Icon]) => (
          <Link
            key={key}
            href={`${base}/reports?kind=${key}`}
            aria-current={kind === key ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{title}</span>
          </Link>
        ))}
      </nav>
      {classes.isError ? (
        <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
      ) : (
        <Field label="کلاس گزارش">
          <select
            value={classId}
            disabled={classes.isPending}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">همهٔ کلاس‌های آموزشگاه</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <ReportData key={kind + classId} kind={kind} classId={classId} />
    </div>
  );
}
function ReportTable<T>({
  items,
  columns,
  rowKey,
  cells,
}: {
  items: T[];
  columns: string[];
  rowKey: (row: T) => string;
  cells: (row: T) => ReactNode[];
}) {
  return items.length ? (
    <div className={s.tableWrap}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={rowKey(row)}>
              {cells(row).map((cell, i) => (
                <td key={i}>{typeof cell === 'number' ? cell.toLocaleString('fa-IR') : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState
      title="گزارشی در این محدوده ثبت نشده است"
      description="کلاس دیگری انتخاب کنید یا پس از ثبت فعالیت‌ها دوباره بررسی کنید."
    />
  );
}
export function ReportData({ kind, classId = '' }: { kind: Kind; classId?: string }) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    PageNumber: String(page),
    PageSize: '30',
    ...(classId ? { ClassId: classId } : {}),
  });
  type Page =
    | S['ReportPageOfManagerTeacherWorkloadReportItem']
    | S['ReportPageOfManagerAttendanceReportItem']
    | S['ReportPageOfManagerAssessmentReportItem']
    | S['ReportPageOfManagerEnrollmentReportItem'];
  const q = usePersonalApi<Page>(`/api/v1/reports/manager/${kind}?${query}`, { poll: 10000 });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const classLink = (id: string, title: string) => (
    <Link href={`${base}/classes/${id}`}>{title}</Link>
  );
  return (
    <Card title={reports.find(([key]) => key === kind)![1]}>
      <p className={s.updated}>به‌روزرسانی گزارش: {date(q.data.dataAsOfUtc, true)}</p>
      {kind === 'teacher-workload' ? (
        <ReportTable
          items={(q.data as S['ReportPageOfManagerTeacherWorkloadReportItem']).items}
          rowKey={(r) => r.teacherMembershipId}
          columns={[
            'معلم',
            'کلاس فعال',
            'جلسهٔ برگزارشده',
            'حضور ثبت‌نشده',
            'تکلیف در انتظار ارزیابی',
            'آزمون در انتظار ارزیابی',
          ]}
          cells={(r) => [
            r.teacherDisplayName,
            r.activeClassCount,
            r.completedSessionCount,
            r.attendanceMissingCount,
            r.assignmentPendingGradingCount,
            r.examPendingGradingCount,
          ]}
        />
      ) : kind === 'attendance' ? (
        <ReportTable
          items={(q.data as S['ReportPageOfManagerAttendanceReportItem']).items}
          rowKey={(r) => r.classId}
          columns={['کلاس', 'ثبت‌شده', 'حاضر', 'غایب', 'تأخیر', 'ثبت‌نشده']}
          cells={(r) => [
            classLink(r.classId, r.classTitle),
            r.recordedCount,
            r.presentCount,
            r.absentCount,
            r.lateCount,
            r.notRecordedCount,
          ]}
        />
      ) : kind === 'assessments' ? (
        <ReportTable
          items={(q.data as S['ReportPageOfManagerAssessmentReportItem']).items}
          rowKey={(r) => r.kind + r.assessmentId}
          columns={[
            'عنوان',
            'نوع',
            'کلاس',
            'مهلت',
            'مخاطبان',
            'تحویل‌شده',
            'نتیجهٔ منتشرشده',
            'ارزیابی باقی‌مانده',
          ]}
          cells={(r) => [
            r.title,
            r.kind === 'Assignment' ? 'تکلیف' : r.kind === 'Exam' ? 'آزمون' : label(r.kind),
            classLink(r.classId, r.classTitle),
            date(r.deadlineUtc, true),
            r.recipientCount,
            r.submittedOrFinalizedCount,
            r.releasedResultCount,
            r.pendingGradingCount,
          ]}
        />
      ) : (
        <ReportTable
          items={(q.data as S['ReportPageOfManagerEnrollmentReportItem']).items}
          rowKey={(r) => r.enrollmentId}
          columns={['دانش‌آموز', 'کلاس', 'وضعیت', 'تاریخ ثبت‌نام']}
          cells={(r) => [
            r.learnerDisplayName,
            classLink(r.classId, r.classTitle),
            label(r.status),
            date(r.enrolledAtUtc, true),
          ]}
        />
      )}
      <Pager
        page={q.data.pageNumber}
        total={q.data.totalCount}
        size={q.data.pageSize}
        onChange={setPage}
      />
    </Card>
  );
}
export function ClassPerformance({ id }: { id: string }) {
  const q = usePersonalApi<S['ManagerClassPerformanceDto']>(
    `/api/v1/reports/manager/classes/${id}`,
    { poll: 10000 },
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.classId !== id) return <EmptyState title="گزارش این کلاس قابل نمایش نیست" />;
  const d = q.data;
  return (
    <Card title="گزارش عملکرد کلاس">
      <dl className={s.metrics}>
        {[
          ['دانش‌آموز فعال', d.activeLearnerCount],
          ['نتیجهٔ تکلیف منتشرشده', d.assignmentReleasedResultCount],
          [
            'میانگین تکلیف',
            d.assignmentAveragePercentage === null
              ? 'هنوز محاسبه نشده'
              : d.assignmentAveragePercentage.toLocaleString('fa-IR') + '٪',
          ],
          ['نتیجهٔ آزمون منتشرشده', d.examReleasedResultCount],
          [
            'میانگین آزمون',
            d.examAveragePercentage === null
              ? 'هنوز محاسبه نشده'
              : d.examAveragePercentage.toLocaleString('fa-IR') + '٪',
          ],
        ].map(([title, value]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</dd>
          </div>
        ))}
      </dl>
      <p className={s.updated}>داده‌های گزارش: {date(d.dataAsOfUtc, true)}</p>
    </Card>
  );
}
