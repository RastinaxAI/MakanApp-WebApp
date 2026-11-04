import { randomUUID } from 'node:crypto';
import { savedFixtureSummaries } from './message-actions.mjs';
import { make, ids } from './state.mjs';
import { release42Route } from './release-42c.mjs';
import { releaseRoute } from './release-e11.mjs';
import { conversationDetailsRoute } from './conversation-details.mjs';
import { messagingRoute } from './messaging.mjs';
export const noCapabilities = () => make('ConversationEffectiveCapabilities');
export function conversationCapabilities(value, auth, state) {
  const override = state.release154?.capabilities?.[auth?.user.id];
  if (override) return { ...noCapabilities(), ...override };
  const stored =
    state.conversationDetail?.conversationId === value.conversationId
      ? state.conversationDetail
      : value;
  const member = stored.participants?.find(
    (p) => p.user.userId === auth?.user.id && p.status === 'Active',
  );
  const owner = member?.role === 'Owner' && stored.managementPolicy === 'UserManaged';
  const caps = noCapabilities();
  if (owner) for (const key of Object.keys(caps)) caps[key] = true;
  else if (value.type === 'Group')
    caps.canPublish =
      !!member && /SendMessages|LegacyMemberDefault|All/.test(stored.memberCapabilities ?? '');
  if (value.official && state.officialCase)
    caps.canPublish = value.type === 'Group' && (state.officialCase.canSend ?? true);
  return caps;
}
export function enrichConversation(value, auth, state) {
  if (Array.isArray(value)) return value.map((v) => enrichConversation(v, auth, state));
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value.items))
    return { ...value, items: value.items.map((v) => enrichConversation(v, auth, state)) };
  if (value.conversationId && ['Group', 'Channel'].includes(value.type))
    return { ...value, effectiveCapabilities: conversationCapabilities(value, auth, state) };
  return value;
}
export function release154Route(ctx) {
  const { state, auth, url, req, body, send } = ctx,
    p = url.pathname;
  if (p === '/api/v1/conversations/account') {
    const filter = url.searchParams.get('Filter') ?? 'All',
      search = url.searchParams.get('Search') ?? '',
      limit = Number(url.searchParams.get('Limit') ?? 30),
      cursor = url.searchParams.get('Cursor');
    state.accountCursors ??= new Map();
    const binding = JSON.stringify([req.headers.authorization, filter, search, limit]);
    const old = cursor ? state.accountCursors.get(cursor) : null;
    if (cursor && old?.binding !== binding)
      return send({ code: 'ACCOUNT_INBOX_CURSOR_INVALID' }, 400);
    const rows = [];
    for (const scope of [
      'Personal',
      ...(['Student', 'Teacher', 'Manager'].includes(auth.role) ? ['Organization'] : []),
    ]) {
      const legacy = new URL('/api/v1/conversations', url);
      for (const [key, value] of Object.entries({
        scope,
        filter,
        page: '1',
        pageSize: '10000',
        q: search,
      }))
        legacy.searchParams.set(key, value);
      const selected =
        scope === 'Organization' && auth.context.workspaceType !== 'Organization'
          ? {
              ...auth,
              context: {
                ...auth.context,
                workspaceType: 'Organization',
                organizationId: ids.org,
                activeRole: auth.role,
              },
            }
          : auth;
      const sub = {
        ...ctx,
        url: legacy,
        auth: selected,
        send: (value, status = 200) => {
          if (status < 400 && Array.isArray(value)) rows.push(...value);
          return true;
        },
      };
      for (const route of [release42Route, releaseRoute, conversationDetailsRoute, messagingRoute])
        if (route(sub)) break;
    }
    rows.push(...savedFixtureSummaries(state, auth));
    const unique = [...new Map(rows.map((row) => [row.conversationId, row])).values()].filter(
      (row) =>
        (filter === 'All' ||
          row.type === filter ||
          (filter === 'Unread' && row.unreadCount > 0) ||
          (filter === 'Archived' && row.isArchived)) &&
        (!search ||
          JSON.stringify([
            row.title,
            row.otherParticipant?.displayName,
            row.lastMessagePreview,
          ]).includes(search)),
    );
    unique.sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        (Date.parse(b.lastMessageAtUtc ?? '') || 0) - (Date.parse(a.lastMessageAtUtc ?? '') || 0) ||
        a.conversationId.localeCompare(b.conversationId),
    );
    const offset = old?.offset ?? 0,
      items = unique.slice(offset, offset + limit),
      hasMore = offset + limit < unique.length,
      nextCursor = hasMore ? randomUUID() : null;
    if (nextCursor) state.accountCursors.set(nextCursor, { binding, offset: offset + limit });
    return send({ items, nextCursor, hasMore });
  }
  if (p === '/api/v1/conversations/permissions')
    return send([
      {
        key: 'SendMessages',
        category: 'Member',
        flag: 1,
        description: 'ارسال پیام',
        conversationTypes: ['Group'],
        ownerCanGrant: true,
        adminCanDelegate: false,
        appliesToUserManaged: true,
        appliesToSystemManagedAcademic: false,
        officialRelationshipDerivedOnly: false,
        delegationRequirement: 'Owner',
      },
    ]);
  if (p === '/api/v1/realtime/account-inbox/changes')
    return send(
      make('AccountChangePageResult', {
        changes: [],
        nextCursor: 'inbox-' + auth.user.id,
        hasMore: false,
        watermark: '1',
        epoch: 'inbox',
        contextRevision: 'account',
        retryAfterMilliseconds: 5000,
      }),
    );
  if (
    p.endsWith('/photo') &&
    state.conversationDetail &&
    p.includes(state.conversationDetail.conversationId)
  ) {
    const value = state.conversationDetail;
    if (!conversationCapabilities(value, auth, state).canEditInfo)
      return send({ code: 'FORBIDDEN' }, 403);
    const version =
      req.method === 'DELETE' ? url.searchParams.get('expectedVersion') : body.expectedVersion;
    if (version !== value.version) return send({ code: 'CONVERSATION_VERSION_MISMATCH' }, 412);
    const file = req.method === 'PUT' ? state.files.get(body.fileAssetId) : null;
    if (
      req.method === 'PUT' &&
      (!file || file.asset.uploadedByUserId !== auth.user.id || file.asset.status !== 'Ready')
    )
      return send({ code: 'FILE_NOT_READY' }, 409);
    if (file && !['image/jpeg', 'image/png'].includes(file.asset.contentType))
      return send({ code: 'CONVERSATION_PHOTO_TYPE_NOT_ALLOWED' }, 415);
    value.photo = file
      ? { fileAssetId: file.asset.id, contentType: file.asset.contentType, downloadUrl: null }
      : null;
    value.version = 'photo-' + randomUUID();
    return send({
      conversationId: value.conversationId,
      photo: value.photo,
      version: value.version,
    });
  }
  return false;
}
