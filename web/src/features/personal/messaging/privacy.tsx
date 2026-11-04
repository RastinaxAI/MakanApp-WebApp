'use client';
import '@/features/reference/bundles/features-personal-messaging-privacy';

import * as uiText from '@/content/fa';
import { MessagingSurface } from './messaging-surface';
import { ReferenceFrame } from '@/features/reference/frame';
import Link from 'next/link';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { Ban, CheckCircle2, Save, ShieldCheck } from 'lucide-react';

import { useRef, useState } from 'react';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { useQueryClient } from '@tanstack/react-query';
import f from './privacy.module.css';
import s from '../personal.module.css';
import { usePersonal, usePersonalApi } from '../provider';

export function MessagingPrivacyPage() {
  const privacy = usePersonalApi<components['schemas']['MessagingPrivacySettingsResult']>(
    '/api/v1/messaging/privacy',
  );
  return (
    <ReferenceFrame id="MK-49" back="/personal/profile">
      {privacy.isPending ? (
        <LoadingSkeleton />
      ) : privacy.isError && !privacy.data ? (
        <ErrorState error={privacy.error} onRetry={() => void privacy.refetch()} />
      ) : (
        <PrivacyForm
          current={privacy.data!}
          reload={async () => {
            const result = await privacy.refetch();
            if (result.isError) throw result.error;
            return result.data;
          }}
        />
      )}
      <div className="list">
        <Link className="row" href="/personal/settings/blocked">
          <span className="tile-icon">
            <Ban size={21} />
          </span>
          <span className="grow">
            <h4>{uiText.text_3393e0c3cb74}</h4>
            <p>{uiText.text_a636c65f53a1}</p>
          </span>
        </Link>
        <Link className="row" href="/personal/profile/details">
          <span className="tile-icon">
            <ShieldCheck size={21} />
          </span>
          <span className="grow">
            <h4>{uiText.text_49475717c2c3}</h4>
            <p>{uiText.text_9972b94c18ef}</p>
          </span>
        </Link>
        <Link className="row" href="/personal/education/guardians">
          <span className="grow">
            <h4>{uiText.text_a62bc2f40f0c}</h4>
            <p>{uiText.text_0dfe1563bdb0}</p>
          </span>
        </Link>
      </div>
    </ReferenceFrame>
  );
}
const privacyFields = [
  ['directMessagesAudience', uiText.text_aea007437dcd, uiText.text_2c200604a458],
  ['phoneNumberVisibilityAudience', uiText.text_ff36750eb49e, uiText.text_b6626668a7fb],
  ['phoneNumberDiscoveryAudience', uiText.text_77fdd18e61ea, uiText.text_b6a4e992aaf8],
  ['groupInvitesAudience', uiText.text_d081756dcca9, uiText.text_0fefec72ebf9],
  ['onlineAudience', uiText.text_13d5a41bae50, uiText.text_9d3e90cf697f],
  ['lastSeenAudience', uiText.text_f69bd374c9b5, uiText.text_0a51d924c603],
] as const;
function PrivacyForm({
  current,
  reload,
}: {
  current: components['schemas']['MessagingPrivacySettingsResult'];
  reload: () => Promise<components['schemas']['MessagingPrivacySettingsResult'] | undefined>;
}) {
  const { call, session } = usePersonal();
  const cache = useQueryClient();
  const [values, setValues] = useState(current),
    [baseline, setBaseline] = useState(current),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const dirty = privacyFields.some(([key]) => values[key] !== baseline[key]);
  useUnsavedChanges(dirty);
  return (
    <form
      className={f.form + ' mk-privacy-form'}
      data-privacy-form
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || !dirty) return;
        lock.current = true;
        setBusy(true);
        setError(undefined);
        setSaved(false);
        try {
          const body: components['schemas']['UpdateMessagingPrivacyCommand'] = {
            directMessagesAudience: values.directMessagesAudience,
            phoneNumberVisibilityAudience: values.phoneNumberVisibilityAudience,
            phoneNumberDiscoveryAudience: values.phoneNumberDiscoveryAudience,
            groupInvitesAudience: values.groupInvitesAudience,
            expectedVersion: baseline.version,
            ...(values.onlineAudience !== undefined
              ? { onlineAudience: values.onlineAudience }
              : {}),
            ...(values.lastSeenAudience !== undefined
              ? { lastSeenAudience: values.lastSeenAudience }
              : {}),
          };
          const result = await call<components['schemas']['MessagingPrivacySettingsResult']>(
            '/api/v1/messaging/privacy',
            { method: 'PUT', body: JSON.stringify(body) },
          );
          setValues(result);
          setBaseline(result);
          setSaved(true);
          cache.setQueryData(
            ['personal', session.user.id, session.revision, '/api/v1/messaging/privacy'],
            result,
          );
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
          lock.current = false;
        }
      }}
    >
      <div className={f.intro}>
        <ShieldCheck size={24} />
        <div>
          <h2>{uiText.text_d82b15f3fac3}</h2>
          <p>{uiText.text_be5f42fbe752}</p>
        </div>
      </div>
      {[
        { title: uiText.text_c1ca1e8b2d02, keys: privacyFields.slice(0, 4) },
        { title: uiText.text_5f78cf2b8f06, keys: privacyFields.slice(4) },
      ]
        .filter((group) => group.keys.some(([key]) => values[key] !== undefined))
        .map((group) => (
          <fieldset key={group.title} className={f.group}>
            <legend>{group.title}</legend>
            {group.keys
              .filter(([key]) => values[key] !== undefined)
              .map(([key, title, description]) => (
                <div className={f.field} key={key}>
                  <div>
                    <label htmlFor={'privacy-' + key}>{title}</label>
                    <p id={'hint-' + key}>{description}</p>
                  </div>
                  <select
                    id={'privacy-' + key}
                    aria-describedby={'hint-' + key}
                    disabled={busy}
                    value={values[key] ?? ''}
                    onChange={(e) => {
                      setSaved(false);
                      setValues((previous) => ({ ...previous, [key]: e.target.value }));
                    }}
                  >
                    <option value="" disabled>
                      {uiText.text_fa03e1b8bb9e}
                    </option>
                    <option value="Everyone">{uiText.text_15270886eadd}</option>
                    <option value="Contacts">{uiText.text_e7648aa5d077}</option>
                    <option value="Nobody">{uiText.text_29dbbef63dce}</option>
                  </select>
                </div>
              ))}
          </fieldset>
        ))}
      <div className={f.feedback}>
        {!!error && <ErrorState error={error} />}
        {saved && (
          <p className={f.success} role="status">
            <CheckCircle2 size={18} />
            {uiText.text_b0806e32d30f}
          </p>
        )}
      </div>
      <footer className={f.footer} data-privacy-actions>
        <p>{dirty ? uiText.text_00d4b98d0841 : uiText.text_d37da57e6b25}</p>
        <div className={f.buttons}>
          <Button type="submit" disabled={busy || !dirty}>
            <Save size={18} />
            {busy ? uiText.text_b5ef00b1806f : uiText.text_1d615f338733}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (dirty && !window.confirm(uiText.text_e00522c63330)) return;
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              try {
                const next = await reload();
                if (next) {
                  setValues(next);
                  setBaseline(next);
                  setSaved(false);
                  setError(undefined);
                }
              } catch (problem) {
                setError(problem);
              } finally {
                setBusy(false);
                lock.current = false;
              }
            }}
          >
            {uiText.text_aae95f355460}
          </Button>
        </div>
      </footer>
    </form>
  );
}
export function BlockedAccountsPage() {
  return (
    <MessagingSurface>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>{uiText.text_6390b19951fb}</span>
          <h1>{uiText.text_3393e0c3cb74}</h1>
          <p>{uiText.text_a06763105959}</p>
        </div>
        <PageBack href="/personal/settings" />
      </div>
      <BlockedPeople />
    </MessagingSurface>
  );
}
function BlockedPeople() {
  const { call } = usePersonal();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<unknown>();
  const blocked = usePersonalApi<components['schemas']['BlockedUserResult'][]>(
    '/api/v1/messaging/blocks',
  );
  return (
    <section className={s.profileCard}>
      {blocked.isPending ? (
        <LoadingSkeleton />
      ) : blocked.isError ? (
        <ErrorState error={blocked.error} onRetry={() => void blocked.refetch()} />
      ) : !blocked.data.length ? (
        <EmptyState title={uiText.text_8fa2b3ccd332} description={uiText.text_92d06ba85662} />
      ) : (
        <div className={s.contactRows}>
          {blocked.data.map((item) => (
            <article key={item.blockId} className={s.contactRow}>
              <span className={s.avatar}>
                <Ban size={18} />
              </span>
              <div>
                <strong>{item.user.displayName}</strong>
                <small>{date(item.createdAtUtc)}</small>
              </div>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(item.user.userId);
                  setError(undefined);
                  try {
                    await call('/api/v1/messaging/blocks/' + item.user.userId, {
                      method: 'DELETE',
                    });
                    await blocked.refetch();
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === item.user.userId ? uiText.text_b5ef00b1806f : uiText.text_304587745c01}
              </Button>
            </article>
          ))}
        </div>
      )}
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
