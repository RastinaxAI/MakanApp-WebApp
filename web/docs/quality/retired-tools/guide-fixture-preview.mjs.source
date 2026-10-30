// Explicit, temporary CLIENT QA fixture server. Never used by the product launcher.
// No external network, real account, entitlement or server-security verification.
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const schemas = JSON.parse(readFileSync(join(root, 'contracts/openapi.json'), 'utf8')).components
  .schemas;
function sample(schema) {
  if (schema.$ref) return sample(schemas[schema.$ref.split('/').pop()]);
  if (schema.nullable) return null;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'object')
    return Object.fromEntries(
      (schema.required || []).map((key) => [key, sample(schema.properties[key])]),
    );
  if (schema.type === 'array') return [];
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.format === 'uuid') return randomUUID();
  if (schema.format === 'date-time') return new Date().toISOString();
  if (schema.format === 'date') return '2000-01-01';
  return 'نمونهٔ آزمون رابط';
}
const users = new Map(),
  assets = new Map();
const organizationId = randomUUID();
const calendarClass = {
  ...sample(schemas.ClassResult),
  id: 'c1111111-1111-4111-8111-111111111111',
  organizationId,
  title: 'کلاس نمونهٔ تقویم',
  courseTitle: 'درس نمونه',
  academicPeriodTitle: 'دورهٔ نمونه',
  status: 'Active',
  capacity: 10,
};
const person = {
  ...sample(schemas.OrganizationPersonDto),
  id: randomUUID(),
  firstName: 'دانش‌آموز',
  lastName: 'نمونه',
  displayName: 'دانش‌آموز نمونهٔ آزمون',
};
const sessions = mkdtempSync(join(tmpdir(), 'makan-guide-client-fixtures-'));
function cleanSessions() {
  const target = resolve(sessions);
  if (
    dirname(target) !== resolve(tmpdir()) ||
    !basename(target).startsWith('makan-guide-client-fixtures-')
  )
    throw new Error('Unexpected fixture session directory');
  rmSync(target, { recursive: true, force: true });
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3457');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const body = req.headers['content-type']?.startsWith('application/json')
      ? JSON.parse(bytes.toString() || '{}')
      : {};
    const send = (value, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'X-Makan-Test-Fixture': 'true' });
      res.end(value === null ? undefined : JSON.stringify(value));
    };
    if (url.pathname.endsWith('/auth/otp/challenges'))
      return send(
        {
          challengeId: randomUUID(),
          expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAtUtc: new Date().toISOString(),
        },
        202,
      );
    if (url.pathname.endsWith('/auth/otp/verify')) {
      const manager = body.phoneNumber.endsWith('104');
      const user = {
        id: randomUUID(),
        phoneNumber: body.phoneNumber,
        isProfileComplete: true,
        firstName: manager ? 'مدیر' : 'حساب',
        lastName: 'نمونه',
        displayName: 'نمونهٔ آزمون رابط',
        username: manager ? 'fixture.manager' : 'fixture.profile',
        dateOfBirth: null,
        profilePhoto: null,
      };
      const token = randomUUID();
      const context = {
        actorId: user.id,
        userId: user.id,
        sessionId: randomUUID(),
        workspaceType: 'Personal',
        organizationId: null,
        membershipId: null,
        activeRole: null,
        subjectOrganizationPersonId: null,
      };
      users.set(token, { user, context, manager, membershipId: randomUUID() });
      return send({
        accessToken: token,
        refreshToken: randomUUID(),
        tokenType: 'Bearer',
        expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
        refreshExpiresAtUtc: new Date(Date.now() + 7200000).toISOString(),
        user,
      });
    }
    const auth = users.get(req.headers.authorization?.replace(/^Bearer /, ''));
    if (!auth) return send({ code: 'FIXTURE_UNAUTHENTICATED' }, 401);
    if (url.pathname.endsWith('/auth/logout')) return send(null, 204);
    if (url.pathname === '/api/v1/me') return send(auth.user);
    if (url.pathname === '/api/v1/workspaces/current') return send(auth.context);
    if (url.pathname === '/api/v1/workspaces/me')
      return send([
        {
          workspaceType: 'Personal',
          organizationId: null,
          organizationName: null,
          membershipId: null,
          role: null,
          displayName: 'فضای شخصی نمونه',
          status: 'Active',
        },
        ...(auth.manager
          ? [
              {
                workspaceType: 'Organization',
                organizationId,
                organizationName: 'آموزشگاه نمونهٔ آزمون',
                membershipId: auth.membershipId,
                role: 'Manager',
                displayName: 'مدیر نمونه',
                status: 'Active',
              },
            ]
          : []),
      ]);
    if (url.pathname === '/api/v1/workspaces/select') {
      Object.assign(auth.context, body, { organizationId, activeRole: body.role });
      return send(auth.context);
    }
    if (url.pathname === '/api/v1/me/messaging-status')
      return send(sample(schemas.MessagingStatusResult));
    if (url.pathname === '/api/v1/academic/classes') return send([calendarClass]);
    if (url.pathname === '/api/v1/academic/schedule') return send([]);
    if (url.pathname === '/api/v1/academic/periods' && req.method === 'POST')
      return send(
        { ...sample(schemas.AcademicPeriodResult), id: randomUUID(), organizationId, ...body },
        201,
      );
    if (
      url.pathname === '/api/v1/academic/classes/' + calendarClass.id + '/sessions' &&
      req.method === 'POST'
    )
      return send(
        {
          ...sample(schemas.SessionResult),
          id: randomUUID(),
          organizationId,
          classId: calendarClass.id,
          classTitle: calendarClass.title,
          ...body,
        },
        201,
      );
    if (url.pathname === '/api/v1/me/profile') {
      if (body.dateOfBirth && body.dateOfBirth > new Date().toISOString().slice(0, 10))
        return send({ code: 'PROFILE_VALIDATION_FAILED' }, 400);
      const { dateOfBirth, ...fields } = body;
      Object.assign(auth.user, fields);
      if (dateOfBirth) auth.user.dateOfBirth = dateOfBirth;
      return send(auth.user);
    }
    if (url.pathname === '/api/v1/me/profile-photo') {
      if (req.method === 'DELETE') {
        auth.user.profilePhoto = null;
        return send(null, 204);
      }
      const asset = assets.get(body.fileAssetId);
      if (!asset || asset.meta.uploadedByUserId !== auth.user.id)
        return send({ code: 'FILE_NOT_FOUND' }, 404);
      auth.user.profilePhoto = {
        fileAssetId: asset.meta.id,
        contentType: asset.meta.contentType,
        downloadUrl: null,
      };
      return send(auth.user.profilePhoto);
    }
    if (url.pathname === '/api/v1/files' && req.method === 'POST') {
      const data = await new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': req.headers['content-type'] },
        body: bytes,
      }).formData();
      const file = data.get('File');
      const id = randomUUID();
      const meta = {
        ...sample(schemas.FileAssetResult),
        id,
        organizationId: null,
        uploadedByUserId: auth.user.id,
        originalFileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        status: file.type === 'image/png' ? 'Pending' : 'Ready',
        rowVersion: 'fixture-v1',
      };
      assets.set(id, { meta, bytes: Buffer.from(await file.arrayBuffer()) });
      return send(meta, 201);
    }
    if (url.pathname.startsWith('/api/v1/files/')) {
      const asset = assets.get(url.pathname.split('/')[4]);
      if (!asset) return send({ code: 'FILE_NOT_FOUND' }, 404);
      if (url.pathname.endsWith('/content')) {
        res.writeHead(200, { 'Content-Type': asset.meta.contentType });
        return res.end(asset.bytes);
      }
      if (asset.meta.status === 'Pending') asset.meta.status = 'Ready';
      return send(asset.meta);
    }
    if (url.pathname === '/api/v1/organization/guardian-relations')
      return send({
        ...sample(schemas.SchoolGuardianRelationsPage),
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 30,
      });
    if (url.pathname === '/api/v1/organization/people')
      return send({
        ...sample(schemas.OrganizationPeoplePage),
        items: [person],
        totalCount: 1,
        page: 1,
        pageSize: 30,
      });
    if (url.pathname.includes('negotiate')) return send({ code: 'FIXTURE_LIVE_DISABLED' }, 503);
    return send({ code: 'FIXTURE_ENDPOINT_NOT_IMPLEMENTED' }, 404);
  } catch {
    res.writeHead(500);
    res.end('{}');
  }
});
server.listen(3457, '127.0.0.1', () => {
  const child = spawn(
    process.execPath,
    [
      join(root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3132',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        APP_ORIGIN: 'http://127.0.0.1:3132',
        BACKEND_BASE_URL: 'http://127.0.0.1:3457',
        SESSION_DIRECTORY: sessions,
        SESSION_SECRET: randomBytes(32).toString('hex'),
        COOKIE_SECURE: 'false',
      },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  const stop = () => {
    child.kill();
    server.close();
    cleanSessions();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', () => {
    server.close();
    cleanSessions();
  });
  console.log('CLIENT FIXTURES ONLY at http://127.0.0.1:3132; isolated from real backend.');
});
