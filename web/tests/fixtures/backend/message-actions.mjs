import { id, ids, make } from './state.mjs';
function savedId(auth) {
  return id(9000 + Number.parseInt(auth.user.id.slice(-4), 16));
}
function metadata(auth, conversationId, type = 'Direct') {
  return make('ManagedConversationResult', {
    conversationId,
    type,
    scope: 'Personal',
    organizationId: null,
    title: type === 'Saved' ? 'پیام‌های ذخیره‌شده' : 'گفتگوی آزمایشی',
    description: null,
    managementPolicy: 'None',
    status: 'Active',
    version: 'message-target-1',
    participants: [
      make('ConversationParticipantResult', {
        user: make('SafeMessagingIdentityResult', {
          userId: auth.user.id,
          displayName: auth.user.displayName,
        }),
        status: 'Active',
        role: 'Owner',
      }),
    ],
  });
}
export function savedFixtureSummaries(state, auth) {
  if (!state.savedAccounts?.has(auth.user.id)) return [];
  const rows = state.savedMessages?.get(auth.user.id) ?? [];
  return [
    make('ConversationSummaryResult', {
      conversationId: savedId(auth),
      type: 'Saved',
      scope: 'Personal',
      organizationId: null,
      title: 'پیام‌های ذخیره‌شده',
      otherParticipant: null,
      lastMessagePreview: rows.at(-1)?.text ?? null,
      lastMessageAtUtc: rows.at(-1)?.sentAtUtc ?? null,
      lastMessageSequence: rows.length,
      unreadCount: 0,
      isArchived: false,
    }),
  ];
}
export function messageActionsRoute({ state, auth, url, body, req, send }) {
  const p = url.pathname;
  if (p === '/api/v1/conversations/saved') {
    state.savedAccounts ??= new Set();
    const existed = state.savedAccounts.has(auth.user.id);
    state.savedAccounts.add(auth.user.id);
    return send(
      make('SavedConversationResult', {
        conversationId: savedId(auth),
        type: 'Saved',
        scope: 'Personal',
        alreadyExisted: existed,
      }),
      existed ? 200 : 201,
    );
  }
  if (
    req.method === 'GET' &&
    p === `/api/v1/conversations/${savedId(auth)}` &&
    state.savedAccounts?.has(auth.user.id)
  )
    return send(metadata(auth, savedId(auth), 'Saved'));
  if (
    req.method === 'GET' &&
    p === `/api/v1/conversations/${ids.chat}` &&
    [id(101), id(102)].includes(auth.user.id)
  )
    return send(metadata(auth, ids.chat));
  if (
    req.method === 'GET' &&
    p === `/api/v1/conversations/${savedId(auth)}/messages` &&
    state.savedAccounts?.has(auth.user.id)
  )
    return send(
      make('ConversationMessagePageResult', {
        messages: state.savedMessages?.get(auth.user.id) ?? [],
        nextBeforeSequence: null,
      }),
    );
  const match = p.match(
    /^\/api\/v1\/conversations\/([^/]+)\/messages\/([^/]+)\/(forward|reports)$/,
  );
  if (!match) return false;
  const [, conversationId, messageId, action] = match,
    source = state.messages.find((m) => m.messageId === messageId);
  if (
    conversationId !== ids.chat ||
    ![id(101), id(102)].includes(auth.user.id) ||
    !source ||
    source.isDeleted
  )
    return send({ code: 'MESSAGE_NOT_AVAILABLE' }, 404);
  state.messageActions ??= new Map();
  const operation = action === 'forward' ? body.clientMessageId : body.clientReportId;
  const old = state.messageActions.get(operation);
  if (old) return send(old, action === 'reports' ? 201 : 200);
  if (action === 'reports') {
    const result = make('AbuseReportReceiptResult', {
      reportId: crypto.randomUUID(),
      conversationId,
      messageId,
      reason: body.reason,
      status: 'Submitted',
    });
    state.messageActions.set(operation, result);
    return send(result, 201);
  }
  if (
    source.kind !== 'Text' ||
    source.attachments.length ||
    ![ids.chat, savedId(auth)].includes(body.destinationConversationId)
  )
    return send({ code: 'FORWARD_NOT_ALLOWED' }, 403);
  const destination = body.destinationConversationId;
  state.savedMessages ??= new Map();
  const rows =
    destination === ids.chat ? state.messages : (state.savedMessages.get(auth.user.id) ?? []);
  const forwarded = {
    ...structuredClone(source),
    messageId: crypto.randomUUID(),
    clientMessageId: body.clientMessageId,
    conversationId: destination,
    sequence: rows.length + 1,
    senderUserId: auth.user.id,
    sender: make('SafeMessagingIdentityResult', {
      userId: auth.user.id,
      displayName: auth.user.displayName,
    }),
    sentAtUtc: new Date().toISOString(),
    isForwarded: true,
  };
  rows.push(forwarded);
  if (destination !== ids.chat) state.savedMessages.set(auth.user.id, rows);
  const result = make('MessageReceiptResult', { ...forwarded, status: 'Sent' });
  state.messageActions.set(operation, result);
  return send(result);
}
