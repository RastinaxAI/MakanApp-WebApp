'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date, latinDigits } from '@/lib/formatting';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { SchoolSearch } from './directory';
import s from './school.module.css';
import { Field, Pager, toUtc, useSchoolAction, useSchoolCommand } from './shared';
type S = components['schemas'];

export function GuardianInvitationForm() {
  const [target, setTarget] = useState(''),
    [mode, setMode] = useState('username'),
    [learner, setLearner] = useState(''),
    [expires, setExpires] = useState(''),
    [reason, setReason] = useState('');
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<S['SchoolGuardianInvitationResult']>();
  const [frozen, setFrozen] = useState<S['CreateSchoolGuardianInvitationCommand'] | null>(null);
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    `/api/v1/organization/people?page=${page}&pageSize=30&search=${encodeURIComponent(search)}`,
  );
  const a = useSchoolAction();
  const command = useSchoolCommand();
  if (receipt)
    return (
      <div className={s.receipt}>
        <h2>{receipt.status === 'Pending' ? uiText.text_de5049310272 : label(receipt.status)}</h2>
        <p>{uiText.text_395ddde85cb3}</p>
        <p>
          {uiText.text_64ab8ca6f7d1}
          {date(receipt.expiresAtUtc)}
        </p>
        {receipt.status === 'Pending' && (
          <ConfirmAction
            title={uiText.text_82f595491fa2}
            trigger={uiText.text_e1eb98be1ea1}
            confirm={uiText.text_0fec1a89d5a8}
            description={uiText.text_20cd03b0aa71}
            destructive
            onConfirm={async () => {
              const result = await command<S['SchoolGuardianInvitationResult']>(
                `/api/v1/organization/guardian-invitations/${receipt.id}/revoke`,
                { expectedRowVersion: receipt.version, reason: uiText.text_8e7fc76e5ae0 },
              );
              setReceipt(result);
              return true;
            }}
          />
        )}
        {a.feedback}
      </div>
    );
  return (
    <>
      <p className={s.hint}>{uiText.text_05259033e1e7}</p>
      <SchoolSearch
        label={uiText.text_e989f79e0442}
        disabled={a.busy || !!frozen}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
          setLearner('');
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Field label={uiText.text_b9c23f90e92a}>
            <select
              disabled={a.busy || !!frozen}
              value={learner}
              onChange={(e) => setLearner(e.target.value)}
            >
              <option value="">{uiText.text_7c2cc959e773}</option>
              {q.data.items.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.displayName || [p.firstName, p.lastName].join(' ')}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={page}
            total={q.data.totalCount}
            onChange={(p) => {
              if (!frozen) {
                setPage(p);
                setLearner('');
              }
            }}
          />
        </>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const command = frozen ?? {
            clientOperationId: crypto.randomUUID(),
            username: mode === 'username' ? target.trim().replace(/^@/, '') : null,
            phoneNumber: mode === 'phone' ? latinDigits(target).trim() : null,
            expiresAtUtc: toUtc(expires),
            reason: reason.trim(),
          };
          setFrozen(command);
          const result = await a.run<S['SchoolGuardianInvitationResult']>(
            `/api/v1/organization/people/${learner}/guardian-invitations`,
            command,
          );
          if (result) setReceipt(result);
        }}
      >
        <fieldset disabled={a.busy || !!frozen}>
          <Field label={uiText.text_bebe8d1190be}>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setTarget('');
              }}
            >
              <option value="username">{uiText.text_173fec6019a6}</option>
              <option value="phone">{uiText.text_d7429b08c9cf}</option>
            </select>
          </Field>
          <Field label={mode === 'phone' ? uiText.text_efca55591503 : uiText.text_ac3aaa5781dc}>
            <input
              dir="ltr"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={mode === 'phone' ? '0912…' : '@username'}
            />
          </Field>
          <Field label={uiText.text_41ffba3860cf}>
            <JalaliDateInput withTime required value={expires} onValueChange={setExpires} />
          </Field>
          <p className={s.hint}>{uiText.text_1bab9e2567d6}</p>
          <Field label={uiText.text_fcd23a2b1bd3}>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </fieldset>
        <Button
          type="submit"
          disabled={a.busy || !learner || !target.trim() || !expires || !reason.trim()}
        >
          {frozen ? uiText.text_4de9dc5e06a0 : uiText.text_1f8d39cd6328}
        </Button>
        {!!a.error && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFrozen(null);
              setReceipt(undefined);
              setTarget((v) => v);
            }}
          >
            {uiText.text_1c5c1a8b7321}
          </Button>
        )}
      </form>
      {a.feedback}
    </>
  );
}
export { InvitationsPage } from './invitations';
