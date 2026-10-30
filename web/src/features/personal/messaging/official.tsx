'use client';
import { ShieldCheck } from 'lucide-react';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import {
  officialMetadataMatches,
  officialPairPath,
  officialConversationCapabilities,
  type OfficialPair,
} from './official-model';
import s from '../school/official-spaces.module.css';

export function OfficialBadge({
  summary,
}: {
  summary: components['schemas']['ConversationSummaryResult'];
}) {
  return officialMetadataMatches(summary) ? (
    <span className={s.badge}>
      <ShieldCheck size={15} />
      {summary.official!.displayLabel}
    </span>
  ) : null;
}
export function useOfficialConversationAccess(
  summary: components['schemas']['ConversationSummaryResult'],
) {
  const { session } = usePersonal();
  const declared = !!summary.official || summary.isOfficial === true;
  const binding =
    officialMetadataMatches(summary) &&
    session.context.workspaceType === 'Organization' &&
    summary.organizationId === session.context.organizationId;
  const q = usePersonalApi<OfficialPair>(
    summary.official ? officialPairPath(summary.official) : '/api/v1/organization/official-spaces',
    {
      enabled: declared && binding,
      poll: 5000,
    },
  );
  const caps = binding && q.isSuccess ? officialConversationCapabilities(summary, q.data) : null;
  const error = !declared
    ? undefined
    : !binding
      ? new ApiError(403)
      : (q.error ?? (q.isSuccess && !caps ? new ApiError(403) : undefined));
  return {
    declared,
    ready: !declared || !!caps,
    canRead: !declared || !!caps?.canRead,
    canSend: !declared || !!caps?.canSend,
    canManage: !declared || !!caps?.canManage,
    error,
    refetch: q.refetch,
  };
}
