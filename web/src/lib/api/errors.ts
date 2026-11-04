import * as uiText from '@/content/fa';
export type Problem = {
  status?: number;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
  retryable?: boolean;
  requiredAction?: 'KEEP_DRAFT_NO_AUTO_RETRY';
};
export const errorMessages: Record<number, string> = {
  400: uiText.text_36172ff32759,
  401: uiText.text_d6873a3168c7,
  403: uiText.text_64e99494313b,
  404: uiText.text_14c150312619,
  409: uiText.text_3caa4f5c26f5,
  410: uiText.text_1e5a2b09970f,
  412: uiText.text_38dd8a208dd7,
  413: uiText.text_f5d382890abb,
  415: uiText.text_a68f5b3bd878,
  422: uiText.text_a3d642be9271,
  429: uiText.text_0a8d14abd16d,
  502: uiText.text_8479f8b715fa,
  503: uiText.text_02ed709e8539,
  504: uiText.text_9f4ad9f85b6e,
};
const serviceMessages: Record<string, string> = {
  FILE_SIZE_MISMATCH: uiText.text_f44e9116c700,
  FILE_TRANSFER_UNAVAILABLE: uiText.text_38ffcfa94bb6,
  OTP_SERVICE_UNAVAILABLE: uiText.text_82e1bd88c000,
  OTP_REQUEST_TIMEOUT: uiText.text_5eb66690dcf3,
  OTP_RESPONSE_INVALID: uiText.text_ea981a3518df,
  CONTRACT_MISMATCH: uiText.text_af6c1c6896ae,
  UPSTREAM_UNAVAILABLE: uiText.text_d5acb6312ff1,
  NETWORK_ERROR: uiText.text_ad5229f8ee19,
};
const actionMessages: Record<string, string> = {
  FILE_NOT_READY: uiText.text_e072ddab3385,
  CONVERSATION_PHOTO_NOT_READY: uiText.text_ba991e0be96f,
  AI_SOURCE_RETRIEVAL_NOT_AVAILABLE: uiText.text_c15951f9823d,
  MESSAGE_SAFETY_BLOCKED: uiText.text_dcb6f8b3c5b3,
  MESSAGE_SAFETY_UNAVAILABLE: uiText.text_c77ef153369e,
  CONVERSATION_PHOTO_TYPE_NOT_ALLOWED: uiText.text_aef30a79f03c,

  CONVERSATION_INVITATION_REQUIRED: uiText.text_aa05f1e891b4,
  FILE_EMPTY: uiText.text_1ac55254f9c7,
  DIRECT_RECIPIENT_NOT_AVAILABLE: uiText.text_104fba439e99,
  CONVERSATION_NOT_FOUND: uiText.text_fe721ecda2f5,
  PROFILE_PHOTO_TYPE_NOT_ALLOWED: uiText.text_139ca31a21fe,
  PROFILE_VALIDATION_FAILED: uiText.text_bb5e08a5ebf0,
  ORGANIZATION_WORKSPACE_REQUIRED: uiText.text_7766da227ecc,
  MESSAGE_SAFETY_REVIEW_REQUIRED: uiText.text_54346a917424,
  FILE_TYPE_NOT_ALLOWED: uiText.text_2d40431bc2c6,
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: Problem = {},
  ) {
    super(
      (problem.code && actionMessages[problem.code]) ||
        (problem.code === 'PERSONAL_WORKSPACE_REQUIRED'
          ? uiText.text_0f076f363d5b
          : problem.code === 'ORIGIN_REJECTED'
            ? uiText.text_2b19b226827a
            : (status >= 500 && problem.code && serviceMessages[problem.code]) ||
              errorMessages[status] ||
              uiText.text_d10610563eab),
    );
    this.name = 'ApiError';
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds)
    ? Math.max(0, seconds)
    : Math.max(0, Math.ceil((Date.parse(value) - now) / 1000)) || undefined;
}
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
export function parseProblem(value: unknown, status: number, retry?: string | null): Problem {
  const p = isRecord(value) ? value : {};
  const errors: Record<string, string[]> = {};
  if (isRecord(p.errors))
    for (const [key, values] of Object.entries(p.errors))
      if (Array.isArray(values))
        errors[key] = values.filter((v): v is string => typeof v === 'string');
  return {
    status,
    code: typeof p.code === 'string' ? p.code : undefined,
    traceId: typeof p.traceId === 'string' ? p.traceId : undefined,
    errors,
    ...(typeof p.retryable === 'boolean' ? { retryable: p.retryable } : {}),
    ...(p.requiredAction === 'KEEP_DRAFT_NO_AUTO_RETRY'
      ? { requiredAction: p.requiredAction }
      : {}),
    retryAfter: retryAfter(retry ?? null),
  };
}
