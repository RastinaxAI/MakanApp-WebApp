import { PersonalEducation } from '@/features/personal/education';
export default async function Page({ params }: { params: Promise<{ section: string[] }> }) {
  return <PersonalEducation section={(await params).section} />;
}
