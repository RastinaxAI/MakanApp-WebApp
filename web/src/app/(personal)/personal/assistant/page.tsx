import { ReferenceAssistant } from '@/features/reference/connected-assistant';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <ReferenceAssistant previewEnabled={process.env.MAKAN_REFERENCE_PREVIEW === 'true'} />;
}
