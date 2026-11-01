import { emitReplay, replayRoute } from './replay.mjs';
import { createServer } from 'node:http';
import { createState, make, ids } from './state.mjs';
import { authRoute } from './auth.mjs';
import { messagingRoute } from './messaging.mjs';
import { schoolRoute } from './school.mjs';
import { workflowRoute } from './workflows.mjs';
import { assessmentRoute, seedAssessments, seedAssignmentDraft } from './assessments.mjs';
import { conversationDetailsRoute, seedConversationDetails } from './conversation-details.mjs';
import { filesRoute } from './files.mjs';
import { seedReferenceCase, referenceChild } from './design-case.mjs';
import { seedManagerCase, managerRoute } from './manager-case.mjs';
import { releaseRoute } from './release-e11.mjs';
import { examAttachmentRoute } from './exam-attachments.mjs';
import { release42Route } from './release-42c.mjs';
export function fixtureBackend(port = 3457) {
  let state = createState();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:' + port),
        chunks = [];
      for await (const b of req) chunks.push(b);
      const bytes = Buffer.concat(chunks),
        body = req.headers['content-type']?.includes('application/json')
          ? JSON.parse(bytes.toString() || '{}')
          : {};
      const send = (value, status = 200) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'X-Makan-Test-Fixture': 'true',
        });
        res.end(status === 204 ? undefined : JSON.stringify(value));
        return true;
      };
      if (url.pathname === '/__test__/reset') {
        state = createState();
        return send({ reset: true });
      }
      if (url.pathname === '/__test__/state')
        return send({
          requests: state.requests,
          attempt: state.attempt,
          lessonCount: state.lessons.size,
        });
      if (url.pathname === '/__test__/design') {
        seedReferenceCase(state);
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/parent-children') {
        state.parentChildren = body.children.map((row) =>
          make('AuthorizedChildResult', { ...referenceChild(), ...row }),
        );
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/assessments') {
        seedAssessments(state);
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/replay-event') {
        emitReplay(state, body);
        return send({ emitted: true });
      }
      if (url.pathname === '/__test__/directory-case') {
        seedManagerCase(state);
        Object.assign(state.managerCase.members[0], {
          username: 'teacher.with.a.long.username.for.responsive.review',
          activeRoles: ['Teacher', 'Parent'],
        });
        Object.assign(state.managerCase.members[1], { organizationPersonId: null });
        Object.assign(state.managerCase.members[3], { canEditNames: false });
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/manager-case') {
        seedManagerCase(state);
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/assignment-draft') {
        seedAssignmentDraft(state);
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/chat-kind') {
        state.chatKind = body.kind === 'Saved' ? 'Saved' : 'Direct';
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/conversation-details') {
        seedConversationDetails(state, body);
        return send({ seeded: true });
      }
      if (url.pathname === '/__test__/education-case') {
        state.invitations = (body.invitations ?? []).map((row) =>
          make('InvitationResult', { organizationId: ids.org, ...row }),
        );
        state.schedule = (body.sessions ?? []).map((row) =>
          make('SessionResult', { organizationId: ids.org, ...row }),
        );
        for (const [role, data] of Object.entries(body.dashboards ?? {})) {
          if (data.nextSession) data.nextSession = make('DashboardSessionItem2', data.nextSession);
          if (data.nearestAssignmentDeadline)
            data.nearestAssignmentDeadline = make(
              'DashboardAssignmentItem2',
              data.nearestAssignmentDeadline,
            );
          if (data.upcomingExams)
            data.upcomingExams = data.upcomingExams.map((row) => make('DashboardExamItem', row));
          state.dashboardOverrides[role] = make(role + 'DashboardDto', {
            organizationId: ids.org,
            ...data,
          });
        }
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/next-file-status') {
        state.nextFileStatus = body.status;
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/exam-policy') {
        state.examFilePolicy = body;
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/ready-files') {
        for (const file of state.files.values()) file.asset.status = 'Ready';
        return send({ updated: true });
      }
      if (url.pathname === '/__test__/fault') {
        state.faults.push(body);
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/inbox-pages') {
        state.inboxPages = body;
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/workspace-visibility') {
        state.workspaceVisibility = body.unresolved ? 'unresolved' : undefined;
        return send({ configured: true });
      }
      if (url.pathname === '/__test__/official-spaces') {
        state.officialCase = {
          groupState: 'Ready',
          channelState: 'Ready',
          ...state.officialCase,
          ...body,
        };
        return send({ configured: true });
      }
      state.requests.push({
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: url.pathname.includes('/auth/') ? undefined : body,
      });
      const fault = state.faults.find(
        (f) => url.pathname.endsWith(f.path) && (!f.method || f.method === req.method),
      );
      if (fault) {
        state.faults.splice(state.faults.indexOf(fault), 1);
        if (fault.delay) await new Promise((r) => setTimeout(r, fault.delay));
        if (fault.status)
          return send(
            { code: fault.code ?? 'FIXTURE_INJECTED_FAILURE', traceId: 'fixture-error' },
            fault.status,
          );
      }
      const ctx = { state, req, res, url, body, bytes, send, auth: null };
      if (authRoute(ctx)) return;
      if (!ctx.auth) return;
      if (release42Route(ctx)) return;
      if (replayRoute(ctx)) return;
      if (managerRoute(ctx)) return;
      if (releaseRoute(ctx)) return;
      if (examAttachmentRoute(ctx)) return;
      if (assessmentRoute(ctx)) return;
      if (conversationDetailsRoute(ctx)) return;
      if (workflowRoute(ctx)) return;
      if (url.pathname === '/api/v1/invitations') return send(state.invitations);
      const invitationAction = /^\/api\/v1\/invitations\/([^/]+)\/(accept|decline)$/.exec(
        url.pathname,
      );
      if (invitationAction && req.method === 'POST') {
        const invitation = state.invitations.find((i) => i.id === invitationAction[1]);
        if (!invitation) return send({ code: 'NOT_FOUND' }, 404);
        if (invitation.status !== 'Pending' || Date.parse(invitation.expiresAtUtc) <= Date.now())
          return send({ code: 'INVITATION_NOT_PENDING' }, 409);
        if (invitationAction[2] === 'accept') {
          if (
            (invitation.requiresPersonLinkConsent && !body.confirmPersonLink) ||
            (invitation.requiresGuardianConsent && !body.confirmGuardianRelation)
          )
            return send({ code: 'GUARDIAN_INVITATION_CONSENT_REQUIRED' }, 400);
          invitation.status = 'Accepted';
          return send(
            make('AcceptInvitationResult', {
              invitationId: invitation.id,
              organizationId: invitation.organizationId,
              organizationName: invitation.organizationName,
              role: invitation.role,
            }),
          );
        }
        invitation.status = 'Declined';
        return send(make('DeclineInvitationResult', { invitationId: invitation.id }));
      }
      if (url.pathname === '/api/v1/guardian/children')
        return send(
          ctx.auth.role === 'Parent'
            ? (state.parentChildren ?? (state.design ? [referenceChild()] : []))
            : [],
        );
      if (
        ctx.auth.role === 'Parent' &&
        /^\/api\/v1\/guardian\/children\/[^/]+\/select$/.test(url.pathname)
      ) {
        const child = (state.parentChildren ?? (state.design ? [referenceChild()] : [])).find(
          (c) =>
            c.learnerOrganizationPersonId === url.pathname.split('/')[5] &&
            c.organizationId === ctx.auth.context.organizationId &&
            c.relationStatus === 'Active',
        );
        if (!child) return send({ code: 'CHILD_NOT_AUTHORIZED' }, 403);
        ctx.auth.context.subjectOrganizationPersonId = child.learnerOrganizationPersonId;
        return send(ctx.auth.context);
      }
      if ((await filesRoute(ctx)) || messagingRoute(ctx) || schoolRoute(ctx)) return;
      return send({ code: 'FIXTURE_ENDPOINT_NOT_IMPLEMENTED', path: url.pathname }, 404);
    } catch (e) {
      console.error('Fixture failure:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'FIXTURE_INTERNAL_ERROR' }));
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
