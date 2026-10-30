'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
  label,
} from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { number } from '@/lib/formatting';
import { usePersonalApi } from '../provider';
import { SchoolSearch, schoolQuery } from './directory';
import { base, Field, Pager } from './shared';
import { DirectoryHeader, RecordIdentity } from './directory-view';
import s from './people.module.css';
const roles = [
  ['', 'همهٔ اعضا'],
  ['Student', 'دانش‌آموزان'],
  ['Teacher', 'معلمان'],
  ['Parent', 'والدین'],
  ['Manager', 'مدیران'],
] as const;
export function MemberDirectory({ initialRole = '' }: { initialRole?: string }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [role, setRole] = useState(initialRole),
    [status, setStatus] = useState('');
  const q = usePersonalApi<components['schemas']['SchoolPageOfSchoolMemberResult']>(
    '/api/v1/organization/members?' +
      schoolQuery(page, search, {
        ...(role ? { Role: role } : {}),
        ...(status ? { Status: status } : {}),
      }),
  );
  return (
    <div className={s.page}>
      <DirectoryHeader />
      <section className={s.panel} aria-label="جستجو و فیلتر اعضا">
        <div className={s.roles} role="group" aria-label="نقش اعضا">
          {roles.map(([value, title]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => {
                setRole(value);
                setPage(1);
              }}
            >
              {title}
            </button>
          ))}
        </div>
        <div className={s.filters}>
          <SchoolSearch
            label="جستجوی اعضای آموزشگاه"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <Field label="وضعیت عضویت">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">همهٔ وضعیت‌ها</option>
              {['Active', 'Suspended', 'Ended'].map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>
      <section className={s.panel} aria-label="فهرست اعضا">
        <header className={s.resultHeading}>
          <h2>{role ? roles.find(([v]) => v === role)?.[1] : 'فهرست اعضا'}</h2>
          {q.data && <span>{number(q.data.totalCount)} نتیجه</span>}
          <Link href={base + '/guardians'}>
            والد و فرزند <ArrowLeft size={15} />
          </Link>
        </header>
        {q.isPending ? (
          <LoadingSkeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            {q.data.items.length ? (
              <div className={s.tableWrap}>
                <table role="table" className={s.table}>
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader">عضو آموزشگاه</th>
                      <th role="columnheader">نقش‌های فعال</th>
                      <th role="columnheader">وضعیت</th>
                      <th role="columnheader">پروندهٔ آموزشی</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {q.data.items.map((m) => (
                      <tr role="row" key={m.membershipId}>
                        <td role="cell">
                          <RecordIdentity name={m.displayName} username={m.username} />
                        </td>
                        <td role="cell" data-label="نقش">
                          {m.activeRoles.length ? (
                            <div className={s.badges}>
                              {m.activeRoles.map((r) => (
                                <span className={s.roleBadge} key={r}>
                                  {label(r)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className={s.muted}>نقش فعالی ندارد</span>
                          )}
                        </td>
                        <td role="cell" data-label="عضویت">
                          <StatusBadge value={m.membershipStatus} />
                        </td>
                        <td role="cell" className={s.actionCell}>
                          {m.organizationPersonId ? (
                            <Button asChild size="sm">
                              <Link
                                href={`${base}/people/${m.organizationPersonId}`}
                                aria-label={'مشاهدهٔ پروندهٔ ' + m.displayName}
                              >
                                <FolderOpen size={16} />
                                مشاهدهٔ پرونده
                              </Link>
                            </Button>
                          ) : (
                            <span className={s.unlinked}>پرونده متصل نیست</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="عضوی با این شرایط پیدا نشد"
                description="نام یا فیلتر نقش و وضعیت را تغییر دهید."
              />
            )}
            <Pager
              page={q.data.page}
              size={q.data.pageSize}
              total={q.data.totalCount}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
