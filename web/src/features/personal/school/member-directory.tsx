'use client';
import * as uiText from '@/content/fa';
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
  ['', uiText.text_b765b14a3118],
  ['Student', uiText.text_35e85a88a0fa],
  ['Teacher', uiText.text_46b599145ed6],
  ['Parent', uiText.text_2d821b70695a],
  ['Manager', uiText.text_8b30165d42c3],
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
      <section className={s.panel} aria-label={uiText.text_894f57ecc265}>
        <div className={s.roles} role="group" aria-label={uiText.text_40fbc1ab0d10}>
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
            label={uiText.text_a144dcd7df31}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <Field label={uiText.text_c8756c7737fc}>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{uiText.text_fa55e47f28bc}</option>
              {['Active', 'Suspended', 'Ended'].map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>
      <section className={s.panel} aria-label={uiText.text_77db9fa6328b}>
        <header className={s.resultHeading}>
          <h2>{role ? roles.find(([v]) => v === role)?.[1] : uiText.text_77db9fa6328b}</h2>
          {q.data && (
            <span>
              {number(q.data.totalCount)}
              {uiText.text_028c8faf7935}
            </span>
          )}
          <Link href={base + '/guardians'}>
            {uiText.text_c48516c2d4d1}
            <ArrowLeft size={15} />
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
                      <th role="columnheader">{uiText.text_4108dae42908}</th>
                      <th role="columnheader">{uiText.text_fde889f86d84}</th>
                      <th role="columnheader">{uiText.text_68d7eb08efbc}</th>
                      <th role="columnheader">{uiText.text_5d33f6812cd4}</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {q.data.items.map((m) => (
                      <tr role="row" key={m.membershipId}>
                        <td role="cell">
                          <RecordIdentity name={m.displayName} username={m.username} />
                        </td>
                        <td role="cell" data-label={uiText.text_628d512903fe}>
                          {m.activeRoles.length ? (
                            <div className={s.badges}>
                              {m.activeRoles.map((r) => (
                                <span className={s.roleBadge} key={r}>
                                  {label(r)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className={s.muted}>{uiText.text_18f6e427c723}</span>
                          )}
                        </td>
                        <td role="cell" data-label={uiText.text_e5e36e24f2b7}>
                          <StatusBadge value={m.membershipStatus} />
                        </td>
                        <td role="cell" className={s.actionCell}>
                          {m.organizationPersonId ? (
                            <Button asChild size="sm">
                              <Link
                                href={`${base}/people/${m.organizationPersonId}`}
                                aria-label={uiText.text_cefa283cd307 + m.displayName}
                              >
                                <FolderOpen size={16} />
                                {uiText.text_895400e35aa6}
                              </Link>
                            </Button>
                          ) : (
                            <span className={s.unlinked}>{uiText.text_0ca10d7c79f2}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title={uiText.text_5e616c8620d1} description={uiText.text_3c1e3421fa35} />
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
