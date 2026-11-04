import { SourceDetail } from '@/features/personal/sources/catalog';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SourceDetail id={id} />;
}
