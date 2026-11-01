import { randomUUID } from 'node:crypto';
import { make, ids, id as fixtureId } from './state.mjs';
export async function filesRoute({ state, req, res, url, bytes, auth, send }) {
  if (!url.pathname.startsWith('/api/v1/files')) return false;
  const personal = url.searchParams.get('workspaceScope') === 'Personal';
  if (req.method === 'POST' && !personal && auth.context.workspaceType !== 'Organization')
    return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
  if (url.pathname === '/api/v1/files' && req.method === 'POST') {
    const form = await new Request('http://fixture/files', {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type'] },
      body: bytes,
    }).formData();
    const file = form.get('File');
    if (!file || typeof file === 'string') return send({ code: 'FILE_REQUIRED' }, 400);
    const id = randomUUID(),
      data = Buffer.from(await file.arrayBuffer());
    const asset = make('FileAssetResult', {
      id,
      organizationId: personal ? null : ids.org,
      uploadedByUserId: auth.user.id,
      originalFileName: file.name,
      contentType: file.type,
      sizeBytes: data.length,
      status: state.nextFileStatus ?? 'Ready',
      rowVersion: 'file-1',
    });
    state.nextFileStatus = undefined;
    state.files.set(id, { asset, data });
    return send(asset, 201);
  }
  const id = url.pathname.split('/')[4],
    file = state.files.get(id);
  if (
    file?.asset.organizationId &&
    (auth.context.workspaceType !== 'Organization' ||
      auth.context.organizationId !== file.asset.organizationId)
  )
    return send({ code: 'FILE_NOT_FOUND' }, 404);
  const evaluationAttachment =
    ['Teacher', 'Manager'].includes(auth.context.activeRole) &&
    (state.assessments?.submission.attachments.some(
      (a) => a.fileAssetId === id && a.fileStatus === 'Ready',
    ) ||
      state.assessments?.grade?.questions.some((q) =>
        q.attachments?.some(
          (a) => a.fileAssetId === id && a.fileStatus === 'Ready' && a.canDownload,
        ),
      ));
  // Only the two actual fixture participants may receive a file referenced by their chat.
  // Upload ownership alone never grants another role access to private media.
  const directAttachment =
    [fixtureId(101), fixtureId(102)].includes(auth.user.id) &&
    state.messages.some(
      (message) =>
        message.conversationId === ids.chat &&
        message.attachments.some((attachment) => attachment.fileAssetId === id),
    );
  if (
    !file ||
    (file.asset.uploadedByUserId !== auth.user.id && !evaluationAttachment && !directAttachment)
  )
    return send({ code: 'FILE_NOT_FOUND' }, 404);
  if (url.pathname.endsWith('/content')) {
    if (file.asset.status !== 'Ready') return send({ code: 'FILE_NOT_READY' }, 409);
    res.writeHead(200, {
      'Content-Type': file.asset.contentType,
      'Content-Length': file.data.length,
      'X-Makan-Test-Fixture': 'true',
    });
    res.end(file.data);
    return true;
  }
  return send(file.asset);
}
