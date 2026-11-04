import { notFound } from 'next/navigation';
import { EducationPreview } from '@/features/reference/education-preview';
import { ReferencePreview } from '@/features/reference/preview';
export const dynamic = 'force-dynamic';
export default async function ReferencePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (process.env.MAKAN_REFERENCE_PREVIEW !== 'true') notFound();
  const { id } = await params;
  if (!/^MK-(0[1-9]|[1-7][0-9]|8[0-2])$/.test(id)) notFound();
  if (/^MK-(44|45|46|6[0-9]|7[0-9]|8[0-2])$/.test(id)) return <EducationPreview key={id} id={id} />;
  return <ReferencePreview key={id} id={id} />;
}
