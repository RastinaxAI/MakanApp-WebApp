import 'server-only';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export function academicFileScope(
  ref: S['AcademicClassRefDto'] | undefined,
  organizationId: string | null,
) {
  if (ref?.kind === 'PersonalClass') return { organizationId: null, personalClassId: ref.classId };
  if (!organizationId) throw new ApiError(403);
  return { organizationId, personalClassId: undefined };
}
/** Rebuild the independent-class multipart envelope from the authorized resource,
 * never a caller-selected class. The same streaming/session guards apply upstream. */
export async function independentUploadForm(request: Request, classId: string) {
  const maximum = 10485760 + 65536;
  if (Number(request.headers.get('content-length')) > maximum) throw new ApiError(413);
  if (!request.body) throw new ApiError(400);
  let bytes = 0;
  const stream = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > maximum) throw new ApiError(413);
        controller.enqueue(chunk);
      },
    }),
  );
  const bounded = new Request(request, { body: stream, duplex: 'half' } as RequestInit & {
    duplex: 'half';
  });
  const form = await bounded.formData();
  const file = form.get('File');
  if (!(file instanceof File) || !file.size || file.size > 10485760) throw new ApiError(400);
  if (form.get('PersonalClassId') !== classId) throw new ApiError(403);
  const result = new FormData();
  result.set('File', file);
  result.set('PersonalClassId', classId);
  return result;
}
