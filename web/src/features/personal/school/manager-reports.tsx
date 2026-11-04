'use client';
import * as uiText from '@/content/fa';
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
  ['teacher-workload', uiText.text_c8522eec5d85, ChartNoAxesCombined],
  ['attendance', uiText.text_6f5f2828fcf2, CalendarCheck],
  ['assessments', uiText.text_3e76be8bc98c, ClipboardCheck],
  ['enrollments', uiText.text_dc5de3fc6954, GraduationCap],
] as const;
type Kind = (typeof reports)[number][0];
export function ManagerReports() {
  const requested = useSearchParams().get('kind');
  const kind = reports.find(([key]) => key === requested)?.[0] ?? 'teacher-workload';
  const [classId, setClassId] = useState('');
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  return (
    <div className={s.stack}>
      <ManagerPageHeader title={uiText.text_2cbe62e265bd} description={uiText.text_ce15f1346b55} />
      <nav className={s.reportTabs} aria-label={uiText.text_cbdfdaa8e710}>
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
        <Field label={uiText.text_437fb367adf5}>
          <select
            value={classId}
            disabled={classes.isPending}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">{uiText.text_5314e6ad0a8f}</option>
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
    <EmptyState title={uiText.text_746a98fe61fd} description={uiText.text_b68ff13bf161} />
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
      <p className={s.updated}>
        {uiText.text_25ae6cfe3ea0}
        {date(q.data.dataAsOfUtc, true)}
      </p>
      {kind === 'teacher-workload' ? (
        <ReportTable
          items={(q.data as S['ReportPageOfManagerTeacherWorkloadReportItem']).items}
          rowKey={(r) => r.teacherMembershipId}
          columns={[
            uiText.text_46a81f723a28,
            uiText.text_e85db0fb2a48,
            uiText.text_2e939b293219,
            uiText.text_3f42a06dca7e,
            uiText.text_bc2ae0bd2843,
            uiText.text_0e85a9de7d6d,
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
          columns={[
            uiText.text_56c43e096bb9,
            uiText.text_fc40112dcc6b,
            uiText.text_40284b78e717,
            uiText.text_921c15ca4d6d,
            uiText.text_ce9a296bdb67,
            uiText.text_cbf88cdc3070,
          ]}
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
            uiText.text_74190f4bb095,
            uiText.text_b55501074dc5,
            uiText.text_56c43e096bb9,
            uiText.text_fbf33464a790,
            uiText.text_b119e3358137,
            uiText.text_5b81f53beda1,
            uiText.text_9ea506c7898d,
            uiText.text_5392fc21c0d3,
          ]}
          cells={(r) => [
            r.title,
            r.kind === 'Assignment'
              ? uiText.text_b9bdf50e5da3
              : r.kind === 'Exam'
                ? uiText.text_206d5b48e297
                : label(r.kind),
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
          columns={[
            uiText.text_fbd179d162db,
            uiText.text_56c43e096bb9,
            uiText.text_68d7eb08efbc,
            uiText.text_aaf7c2e138a5,
          ]}
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
  if (q.data.classId !== id) return <EmptyState title={uiText.text_5c5f6e089f42} />;
  const d = q.data;
  return (
    <Card title={uiText.text_599bb8087251}>
      <dl className={s.metrics}>
        {[
          [uiText.text_8192485568dd, d.activeLearnerCount],
          [uiText.text_ab3e7cbab1a8, d.assignmentReleasedResultCount],
          [
            uiText.text_a1315a65ca38,
            d.assignmentAveragePercentage === null
              ? uiText.text_917a63d23e58
              : d.assignmentAveragePercentage.toLocaleString('fa-IR') + uiText.text_a489ae36a167,
          ],
          [uiText.text_b84635985b83, d.examReleasedResultCount],
          [
            uiText.text_2999be99037f,
            d.examAveragePercentage === null
              ? uiText.text_917a63d23e58
              : d.examAveragePercentage.toLocaleString('fa-IR') + uiText.text_a489ae36a167,
          ],
        ].map(([title, value]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</dd>
          </div>
        ))}
      </dl>
      <p className={s.updated}>
        {uiText.text_9ac2d07cb58e}
        {date(d.dataAsOfUtc, true)}
      </p>
    </Card>
  );
}
