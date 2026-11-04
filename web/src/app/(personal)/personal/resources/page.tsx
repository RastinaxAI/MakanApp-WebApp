import { SourceCatalog } from '@/features/personal/sources/catalog';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string; scope?: string; classId?: string }>;
}) {
  const { upload, scope, classId } = await searchParams;
  const initialScope =
    scope === 'Class' || scope === 'Organization' || scope === 'Library' ? scope : 'Personal';
  return (
    <SourceCatalog
      key={initialScope + String(upload) + String(classId)}
      upload={upload === '1'}
      initialScope={initialScope}
      initialClassId={classId ?? ''}
    />
  );
}
