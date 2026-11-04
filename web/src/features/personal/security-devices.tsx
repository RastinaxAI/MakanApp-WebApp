'use client';
import '@/features/reference/bundles/features-personal-security-devices';

import * as uiText from '@/content/fa';
import { ReferenceFrame } from '@/features/reference/frame';

import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { MonitorSmartphone, ChevronLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonal, usePersonalApi } from './provider';
import s from './account-services.module.css';
type Session = components['schemas']['UserSessionResult'];
const endpoint = '/api/client/security/sessions';
export function SecurityDevices({ id }: { id?: string }) {
  const q = usePersonalApi<Session[]>(endpoint),
    { call, logout } = usePersonal();
  const [notice, setNotice] = useState('');
  const rows = id ? q.data?.filter((row) => row.id === id) : q.data;
  async function revoke(path: string, method: string) {
    await call(path, { method });
    setNotice(uiText.text_5b1d3659c3d8);
    await q.refetch();
    return true;
  }
  return (
    <ReferenceFrame
      id="MK-48"
      title={id ? uiText.text_bcdc391af4f9 : undefined}
      back={id ? '/personal/settings/devices' : '/personal/profile'}
    >
      <div className="card hero">
        <div className="between">
          <h3>{uiText.text_c7645d8f947c}</h3>
          <ShieldCheck size={23} />
        </div>
        <p>{uiText.text_d03ca0340b3d}</p>
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {notice && (
            <p role="status" className={s.badge}>
              {notice}
            </p>
          )}
          <div className="list">
            {rows?.length ? (
              rows.map((row) => (
                <section className="mk-session-row" key={row.id}>
                  <div className="row">
                    <span className="tile-icon">
                      <MonitorSmartphone size={23} />
                    </span>
                    <div className="grow">
                      <strong>{row.deviceName || uiText.text_012b8e7bb3b3}</strong>
                      <small className="muted">
                        {uiText.text_975d46ff5255}
                        {date(row.createdAtUtc, true)}
                      </small>
                      {row.isCurrent && <span className="badge">{uiText.text_ea0c56a7535c}</span>}
                    </div>
                    {!id && (
                      <Link
                        aria-label={
                          uiText.text_f307f4a9a432 + (row.deviceName || uiText.text_f7c6ee7ceb27)
                        }
                        href={'/personal/settings/devices/' + row.id}
                      >
                        <ChevronLeft size={20} />
                      </Link>
                    )}
                  </div>
                  {id && (
                    <dl className={s.details}>
                      <div>
                        <dt>{uiText.text_1b292af7dfa0}</dt>
                        <dd>{date(row.createdAtUtc, true)}</dd>
                      </div>
                      <div>
                        <dt>{uiText.text_5856d67fad0a}</dt>
                        <dd>{date(row.expiresAtUtc, true)}</dd>
                      </div>
                      <div>
                        <dt>{uiText.text_ac852c2d9d64}</dt>
                        <dd>{date(row.absoluteExpiresAtUtc, true)}</dd>
                      </div>
                    </dl>
                  )}
                  <div className={s.actions}>
                    {row.isCurrent ? (
                      <ConfirmAction
                        trigger={uiText.text_989d2fe946b8}
                        title={uiText.text_2ddbb4f12b8f}
                        description={uiText.text_d6e7c047c656}
                        confirm={uiText.account_logout}
                        onConfirm={async () => {
                          await logout();
                          return true;
                        }}
                      />
                    ) : (
                      <ConfirmAction
                        destructive
                        trigger={uiText.text_1706ef5d00c1}
                        title={uiText.text_c074ded08bf3}
                        description={uiText.format_9ca356a23f7a(
                          row.deviceName || uiText.text_a7973bda076f,
                        )}
                        confirm={uiText.text_b1c8d490edb2}
                        onConfirm={() => revoke(endpoint + '/' + row.id, 'DELETE')}
                      />
                    )}
                  </div>
                </section>
              ))
            ) : (
              <EmptyState title={id ? uiText.text_f2415eaf96f4 : uiText.text_99bab8fc872f} />
            )}
          </div>
          {!id && q.data.some((row) => !row.isCurrent) && (
            <div className={s.actions}>
              <ConfirmAction
                destructive
                trigger={uiText.text_a2d7c2cecc5f}
                title={uiText.text_38e1bb39e307}
                description={uiText.text_d555aaf8e0a0}
                confirm={uiText.text_a0fa8bc3a1ab}
                onConfirm={() => revoke(endpoint + '/revoke-others', 'POST')}
              />
            </div>
          )}
        </>
      )}
    </ReferenceFrame>
  );
}
