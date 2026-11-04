import { randomUUID } from 'node:crypto';
import { make, id, ids } from './state.mjs';
const canSchool = (auth) =>
  auth.context.workspaceType === 'Organization' &&
  ['Student', 'Teacher', 'Manager'].includes(auth.context.activeRole);
const canWrite = (auth, scope) =>
  scope === 'Personal' ||
  (auth.context.workspaceType === 'Organization' &&
    (auth.context.activeRole === 'Manager' ||
      (scope === 'Class' && auth.context.activeRole === 'Teacher')));
function capabilities(source, auth) {
  const own =
    source.scope === 'Personal'
      ? source.ownerUserId === auth.user.id
      : canWrite(auth, source.scope);
  return {
    canRead: true,
    canWrite: own,
    canPublish: own,
    canArchive: own,
    canDownload: source.scope !== 'Library',
    canUseForAi: source.scope !== 'Library',
    canCreateVersion: own,
    canChangeVisibility: own,
  };
}
function visible(source, auth) {
  return source.scope === 'Library'
    ? source.publicationStatus === 'Published' && source.visibility === 'Public'
    : source.scope === 'Personal'
      ? source.ownerUserId === auth.user.id
      : canSchool(auth) &&
        (canWrite(auth, source.scope) || source.publicationStatus === 'Published');
}
export function seedSources(state, auth) {
  if (state.sources) return;
  state.sources = new Map();
  state.sourceOperations = new Map();
  for (const [index, scope] of ['Personal', 'Class', 'Organization', 'Library'].entries()) {
    const library = scope === 'Library';
    const row = make('EducationalSourceResult', {
      sourceId: id(1500 + index),
      scope,
      ownerUserId: scope === 'Personal' ? id(101) : null,
      organizationId: ['Class', 'Organization'].includes(scope) ? ids.org : null,
      classId: scope === 'Class' ? ids.class : null,
      status: 'Active',
      visibility: library ? 'Public' : 'Hidden',
      currentVersion: 1,
      publishedVersion: 1,
      revision: 1,
      title: library
        ? 'کتابخانهٔ عمومی آزمایشی'
        : scope === 'Personal'
          ? 'منبع شخصی آزمایشی'
          : 'منبع آموزشی ' + scope,
      description: 'اطلاعات واقعی نما در محیط آزمون ایزوله',
      sourceType: 'Document',
      publicationStatus: 'Published',
      safetyStatus: 'FileValidated',
      processingStatus: 'NotRequested',
      processingFailureCode: null,
      fileReady: !library,
      sourceReady: !library,
      aiReady: false,
      capabilities: {},
      file: library
        ? null
        : {
            fileAssetId: id(1510 + index),
            originalFileName: 'sample.pdf',
            contentType: 'application/pdf',
            sizeBytes: 4,
            status: 'Ready',
          },
      createdByUserId: id(101),
      version: 'opaque-source-' + index,
      aiReadiness: 'Unavailable',
      aiUnavailableReason: 'AI_SOURCE_RETRIEVAL_NOT_AVAILABLE',
    });
    state.sources.set(row.sourceId, row);
  }
}
export function sourcesRoute({ state, auth, url, req, body, res, send }) {
  const path = url.pathname;
  if (!path.startsWith('/api/v1/sources') && path !== '/api/v1/ai/sources/preflight') return false;
  seedSources(state, auth);
  const output = (row) => ({ ...row, capabilities: capabilities(row, auth) });
  if (path === '/api/v1/ai/sources/preflight') {
    const sources = (body.selectedSourceIds ?? []).map((value) => state.sources.get(value));
    if (
      !sources.length ||
      sources.some((row) => !row || !visible(row, auth) || row.scope === 'Library')
    )
      return send({ code: 'SOURCE_ACCESS_DENIED' }, 403);
    return send({
      authorized: true,
      retrievalAvailable: false,
      selectedCount: sources.length,
      errorCode: 'AI_SOURCE_RETRIEVAL_NOT_AVAILABLE',
      commercialStatus: 'NotConsumed',
      versions: sources.map((row) => ({ sourceId: row.sourceId, number: row.revision })),
    });
  }
  if (path === '/api/v1/sources' && req.method === 'GET') {
    const scope = url.searchParams.get('Scope') ?? 'Personal',
      classId = url.searchParams.get('ClassId'),
      search = url.searchParams.get('Search') ?? '';
    if (!['Personal', 'Library'].includes(scope) && !canSchool(auth))
      return send({ code: 'FORBIDDEN' }, 403);
    const rows = [...state.sources.values()]
        .filter(
          (row) =>
            row.scope === scope &&
            visible(row, auth) &&
            (!classId || row.classId === classId) &&
            row.title.includes(search),
        )
        .map(output),
      page = Number(url.searchParams.get('Page') ?? 1),
      pageSize = Number(url.searchParams.get('PageSize') ?? 20);
    return send({
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      totalCount: rows.length,
    });
  }
  if (path === '/api/v1/sources' && req.method === 'POST') {
    const key = auth.user.id + ':' + body.clientOperationId,
      old = state.sourceOperations.get(key);
    if (old)
      return JSON.stringify(old.command) === JSON.stringify(body)
        ? send({ ...output(old.row), replayed: true })
        : send({ code: 'IDEMPOTENCY_CONFLICT' }, 409);
    if (
      body.scope === 'Library' ||
      !canWrite(auth, body.scope) ||
      (body.scope === 'Class' && body.classId !== ids.class)
    )
      return send({ code: 'FORBIDDEN' }, 403);
    const file = state.files.get(body.fileAssetId);
    if (!file || file.asset.status !== 'Ready' || file.asset.uploadedByUserId !== auth.user.id)
      return send({ code: 'FILE_NOT_READY' }, 409);
    const row = make('EducationalSourceResult', {
      sourceId: randomUUID(),
      scope: body.scope,
      ownerUserId: body.scope === 'Personal' ? auth.user.id : null,
      organizationId: body.scope === 'Personal' ? null : ids.org,
      classId: body.classId,
      title: body.title,
      description: body.description,
      status: 'Active',
      visibility: 'Hidden',
      currentVersion: 1,
      publishedVersion: null,
      revision: 1,
      publicationStatus: 'Draft',
      safetyStatus: 'FileValidated',
      processingStatus: 'NotRequested',
      fileReady: true,
      sourceReady: true,
      aiReady: false,
      sourceType: 'Document',
      file: {
        fileAssetId: file.asset.id,
        originalFileName: file.asset.originalFileName,
        contentType: file.asset.contentType,
        sizeBytes: file.asset.sizeBytes,
        status: 'Ready',
      },
      createdByUserId: auth.user.id,
      version: 'source-' + randomUUID(),
      aiUnavailableReason: 'AI_SOURCE_RETRIEVAL_NOT_AVAILABLE',
    });
    state.sources.set(row.sourceId, row);
    state.sourceOperations.set(key, { command: body, row });
    return send(output(row));
  }
  const match =
    /^\/api\/v1\/sources\/([^/]+)(?:\/(processing|draft|versions|publish|archive|visibility|content))?$/.exec(
      path,
    );
  if (!match) return false;
  const row = state.sources.get(match[1]);
  if (!row || !visible(row, auth)) return send({ code: 'SOURCE_NOT_FOUND' }, 404);
  const action = match[2];
  if (req.method === 'GET') {
    if (
      url.searchParams.has('revision') &&
      Number(url.searchParams.get('revision')) !== row.revision
    )
      return send({ code: 'SOURCE_VERSION_NOT_FOUND' }, 404);
    if (action === 'content') {
      if (row.scope === 'Library' || !row.file || !capabilities(row, auth).canDownload)
        return send({ code: 'FORBIDDEN' }, 403);
      const data = state.files.get(row.file.fileAssetId)?.data ?? Buffer.from('%PDF');
      res.writeHead(200, {
        'Content-Type': row.file.contentType,
        'Content-Length': data.length,
        'Content-Disposition': 'attachment; filename="source.pdf"',
        'X-Makan-Test-Fixture': 'true',
      });
      res.end(data);
      return true;
    }
    return send(output(row));
  }
  if (!canWrite(auth, row.scope) || (row.scope === 'Personal' && row.ownerUserId !== auth.user.id))
    return send({ code: 'FORBIDDEN' }, 403);
  if (body.expectedVersion !== row.version) return send({ code: 'SOURCE_VERSION_MISMATCH' }, 412);
  if (action === 'draft') {
    row.title = body.title;
    row.description = body.description;
    row.publicationStatus = 'Draft';
  }
  if (action === 'publish') {
    row.publicationStatus = 'Published';
    row.publishedVersion = row.revision;
    row.publishedAtUtc = new Date().toISOString();
  }
  if (action === 'archive') row.status = 'Archived';
  if (action === 'visibility') row.visibility = body.visibility;
  if (action === 'versions') {
    const file = state.files.get(body.fileAssetId);
    if (!file || file.asset.uploadedByUserId !== auth.user.id || file.asset.status !== 'Ready')
      return send({ code: 'FILE_NOT_READY' }, 409);
    row.revision++;
    row.currentVersion = row.revision;
    row.title = body.title;
    row.description = body.description;
    row.publicationStatus = 'Draft';
    row.file = {
      fileAssetId: file.asset.id,
      originalFileName: file.asset.originalFileName,
      contentType: file.asset.contentType,
      sizeBytes: file.asset.sizeBytes,
      status: 'Ready',
    };
  }
  row.version = 'source-' + randomUUID();
  return send(output(row));
}
