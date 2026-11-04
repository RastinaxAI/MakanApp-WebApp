import { notFound } from 'next/navigation';
import { ExtracurricularRoute } from '@/features/extracurricular/connected';
import { isExtracurricularPath } from '@/features/extracurricular/routes';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string[] }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { section } = await params,
    { step } = await searchParams;
  if (!isExtracurricularPath(section)) notFound();
  return (
    <ExtracurricularRoute
      section={section}
      step={step}
      previewEnabled={process.env.MAKAN_REFERENCE_PREVIEW === 'true'}
    />
  );
}
