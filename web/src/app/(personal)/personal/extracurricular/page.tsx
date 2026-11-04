import { ExtracurricularHome } from '@/features/extracurricular/connected';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <ExtracurricularHome previewEnabled={process.env.MAKAN_REFERENCE_PREVIEW === 'true'} />;
}
