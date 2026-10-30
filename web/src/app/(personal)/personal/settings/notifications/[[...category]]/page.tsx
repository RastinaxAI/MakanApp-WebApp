import { NotificationSettings } from '@/features/personal/notification-settings';
import { notFound } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ category?: string[] }> }) {
  const { category = [] } = await params;
  if (category.length > 1) notFound();
  return <NotificationSettings category={category[0]} />;
}
