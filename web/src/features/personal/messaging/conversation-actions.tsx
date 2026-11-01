'use client';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Files, Info, MoreHorizontal, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import t from './messaging-theme.module.css';

export function ConversationActions({ id, managed }: { id: string; managed: boolean }) {
  return (
    <Menu.Root dir="rtl">
      <Menu.Trigger asChild>
        <Button size="icon" variant="ghost" aria-label="گزینه‌های گفتگو">
          <MoreHorizontal size={24} />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={`dropdown ${t.theme} ${t.menu}`} sideOffset={8} align="end">
          <Menu.Item asChild>
            <Link href={`/personal/messages/${id}/info`}>
              <Info size={20} />
              اطلاعات گفتگو
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link href={`/personal/messages/${id}/media`}>
              <Files size={20} />
              رسانه و فایل
            </Link>
          </Menu.Item>
          {managed && (
            <Menu.Item asChild>
              <Link href={`/personal/messages/${id}/settings`}>
                <Settings size={20} />
                تنظیمات گفتگو
              </Link>
            </Menu.Item>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
