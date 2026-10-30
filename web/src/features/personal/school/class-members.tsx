'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePersonal } from '../provider';
import { ClassRoster } from './directory';
import { base } from './shared';
import s from './education-layout.module.css';
import school from './school.module.css';

export function ClassMembersOverview({ classId }: { classId: string }) {
  const { session } = usePersonal();
  const manage = session.context.activeRole === 'Manager';
  return (
    <div className={s.memberContent}>
      <ClassRoster classId={classId} kind="learners" manage={manage} />
      <ClassRoster classId={classId} kind="teachers" manage={manage} />
      {manage && (
        <div className={school.toolbar}>
          <Button asChild>
            <Link href={`${base}/classes/${classId}/enrollments/new`}>ثبت‌نام دانش‌آموز</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/classes/${classId}/teachers/new`}>انتساب معلم</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
