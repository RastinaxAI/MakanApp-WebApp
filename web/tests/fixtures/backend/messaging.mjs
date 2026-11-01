import { ids, id, make, paged, schemas } from './state.mjs';
export function messagingRoute({ state, url, body, auth, send, req }) {
  const p = url.pathname;
  const profile = (u) =>
    make('MessagingPublicProfileResult', {
      userId: u.id,
      username: u.username,
      displayName: u.displayName,
      phoneNumber: null,
      isSavedContact: true,
      isFavorite: false,
      canStartDirect: true,
      profilePhoto: null,
    });
  if (p === '/api/v1/messaging/privacy') {
    const current =
      state.privacy.get(auth.user.id) ?? make('MessagingPrivacySettingsResult', { version: '1' });
    if (req.method === 'PUT') {
      if (body.expectedVersion !== current.version)
        return send({ code: 'PRIVACY_VERSION_CONFLICT' }, 409);
      const { expectedVersion, ...values } = body;
      const next = {
        ...current,
        ...values,
        isExplicit: true,
        version: String(Number(current.version) + 1),
      };
      state.privacy.set(auth.user.id, next);
      return send(next);
    }
    return send(current);
  }
  if (p === '/api/v1/messaging/blocks') return send([]);
  if (p === '/api/v1/people/search')
    return send(
      paged(
        'PeopleSearchPageResult',
        [...state.users.values()].filter((u) => u.id !== auth.user.id).map(profile),
        url,
      ),
    );
  if (p === '/api/v1/people/resolve') {
    const u = [...state.users.values()].find(
      (u) =>
        u.username.toLowerCase() ===
          String(body.username ?? '')
            .replace(/^@/, '')
            .toLowerCase() || u.phoneNumber === body.phoneNumber,
    );
    return send(
      make('PeopleResolveResult', { isDiscoverable: !!u, profile: u ? profile(u) : null }),
    );
  }
  if (p === '/api/v1/contacts')
    return send(
      paged(
        'UserContactPageResult',
        [...state.users.values()]
          .filter(
            (u) =>
              u.id !== auth.user.id &&
              (!url.searchParams.get('q') ||
                (u.displayName + ' ' + u.username)
                  .toLowerCase()
                  .includes(url.searchParams.get('q').toLowerCase())),
          )
          .map((u) =>
            make('UserContactResult', {
              contactUserId: u.id,
              displayName: u.displayName,
              contact: profile(u),
              profile: profile(u),
            }),
          ),
        url,
      ),
    );
  const allowed = [id(101), id(102)].includes(auth.user.id);
  const summary = () =>
    make('ConversationSummaryResult', {
      conversationId: ids.chat,
      type: 'Direct',
      scope: 'Personal',
      organizationId: null,
      title: null,
      otherParticipant: make('SafeMessagingIdentityResult2', {
        userId: auth.user.id === id(101) ? id(102) : id(101),
        displayName: state.design
          ? auth.user.id === id(101)
            ? 'مریم رضایی'
            : 'سارا احمدی'
          : auth.user.id === id(101)
            ? 'استاد آزمایشی'
            : 'دانشجوی آزمایشی',
        username: auth.user.id === id(101) ? 'test.Teacher' : 'test.Student',
      }),
      lastMessagePreview: state.messages.at(-1)?.text ?? null,
      lastMessageAtUtc: state.messages.at(-1)?.createdAtUtc ?? null,
      lastMessageSequence: state.messages.length,
      unreadCount: state.messages.filter((m) => m.senderUserId !== auth.user.id).length,
      isPinned: false,
      isArchived: state.chatArchived ?? false,
      organization: null,
    });
  if (p === `/api/v1/conversations/${ids.chat}/summary`) {
    return allowed ? send(summary()) : send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
  }
  if (p === '/api/v1/conversations') {
    if (state.inboxPages) {
      const scope = url.searchParams.get('scope'),
        size = Number(url.searchParams.get('pageSize') ?? 30),
        page = Number(url.searchParams.get('page') ?? 1);
      const count =
        scope === 'Personal' ? state.inboxPages.personal : state.inboxPages.organization;
      const rows = Array.from({ length: count ?? 0 }, (_, i) =>
        make('ConversationSummaryResult', {
          conversationId: id((scope === 'Personal' ? 2000 : 3000) + i),
          type: scope === 'Personal' ? 'Direct' : 'Group',
          scope,
          organizationId: scope === 'Personal' ? null : ids.org,
          title: (scope === 'Personal' ? 'گفتگوی حساب ' : 'گفتگوی رسمی ') + (i + 1),
          otherParticipant: null,
          lastMessageAtUtc: new Date(Date.UTC(2026, 10, 1, 12, 0, -i)).toISOString(),
          isPinned: false,
        }),
      );
      return send(rows.slice((page - 1) * size, page * size));
    }
    const filter = url.searchParams.get('filter') ?? 'All';
    const rows =
      allowed &&
      (url.searchParams.get('scope') === 'Personal' || auth.context.workspaceType === 'Personal')
        ? [summary()]
        : [];
    const matching = rows.filter(
      (row) =>
        filter === 'All' ||
        filter === row.type ||
        (filter === 'Unread' && row.unreadCount > 0) ||
        (filter === 'Archived' && row.isArchived),
    );
    const page = Number(url.searchParams.get('page') ?? 1),
      size = Number(url.searchParams.get('pageSize') ?? 30);
    return send(matching.slice((page - 1) * size, page * size));
  }
  if (
    p === `/api/v1/conversations/${ids.chat}/archive` &&
    ['POST', 'DELETE'].includes(req.method)
  ) {
    if (!allowed) return send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
    state.chatArchived = req.method === 'POST';
    return send(
      make('ConversationUserStateResult', {
        conversationId: ids.chat,
        isArchived: state.chatArchived,
        version: '1',
      }),
    );
  }
  if (p === '/api/v1/conversations/direct')
    return allowed &&
      body.scope === 'Personal' &&
      [id(101), id(102)].includes(body.targetUserId) &&
      body.targetUserId !== auth.user.id
      ? send(
          make('DirectConversationResult', {
            conversationId: ids.chat,
            type: 'Direct',
            scope: 'Personal',
            organizationId: null,
            otherParticipant: make('SafeMessagingIdentityResult', {
              userId: body.targetUserId,
              displayName: state.users.get(body.targetUserId)?.displayName ?? 'مخاطب آزمایشی',
              username: state.users.get(body.targetUserId)?.username ?? null,
            }),
            alreadyExisted: true,
          }),
          201,
        )
      : send({ code: 'DIRECT_RECIPIENT_NOT_AVAILABLE' }, 404);
  if (p.startsWith('/api/v1/conversations/' + ids.chat)) {
    if (!allowed) return send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
    if (p.endsWith('/read-states'))
      return send(
        make('ConversationPeerReadStateResult', { conversationId: ids.chat, participants: [] }),
      );
    if (p.endsWith('/read') || p.endsWith('/delivered')) return send(null, 204);
    if (p.endsWith('/messages')) {
      if (req.method === 'POST') {
        const old = state.messages.find(
          (m) => m.clientMessageId === body.clientMessageId && m.senderUserId === auth.user.id,
        );
        if (old) return send(make('MessageReceiptResult', { ...old }));
        const files = (body.attachmentIds ?? []).map((fileId) => state.files.get(fileId));
        if (
          files.some(
            (file) =>
              !file ||
              file.asset.uploadedByUserId !== auth.user.id ||
              file.asset.status !== 'Ready',
          )
        )
          return send({ code: 'FILE_NOT_AVAILABLE' }, 403);
        const m = make('ConversationMessageResult', {
          messageId: id(10000 + state.messages.length),
          conversationId: ids.chat,
          clientMessageId: body.clientMessageId,
          senderUserId: auth.user.id,
          sender: make('SafeMessagingIdentityResult', {
            userId: auth.user.id,
            displayName: auth.user.displayName,
            username: auth.user.username,
          }),
          kind: body.kind ?? 'Text',
          text: body.text,
          sequence: state.messages.length + 1,
          createdAtUtc: new Date().toISOString(),
          sentAtUtc: new Date().toISOString(),
          attachments: files.map(({ asset }) =>
            make('MessageAttachmentResult', {
              fileAssetId: asset.id,
              fileName: asset.originalFileName,
              contentType: asset.contentType,
              sizeBytes: asset.sizeBytes,
              createdAtUtc: asset.createdAtUtc,
              kind: asset.contentType.startsWith('image/')
                ? 'Image'
                : asset.contentType.startsWith('video/')
                  ? 'Video'
                  : 'File',
            }),
          ),
        });
        state.messages.push(m);
        return send(make('MessageReceiptResult', { ...m }));
      }
      return send(
        make('ConversationMessagePageResult', {
          messages: state.messages,
          nextBeforeSequence: null,
        }),
      );
    }
    return send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
  }
  if (p.includes('/negotiate')) return send({ code: 'FIXTURE_LIVE_DISABLED' }, 503);
  // Fail unknown fixture endpoints explicitly instead of returning invented successful data.
  return false;
}
