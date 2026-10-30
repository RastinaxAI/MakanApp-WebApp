import { notFound } from 'next/navigation';
import {
  ConversationPage,
  type ConversationSection,
} from '@/features/personal/messaging/conversation-pages';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    !['info', 'members', 'media', 'settings'].includes(section)
  )
    notFound();
  return <ConversationPage id={id} section={section as ConversationSection} />;
}
