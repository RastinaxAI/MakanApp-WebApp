'use client';
import * as uiText from '@/content/fa';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Files, Info, MoreVertical, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import t from './messaging-theme.module.css';

export function ConversationActions({ id, managed }: { id: string; managed: boolean }) {
  return (
    <Menu.Root dir="rtl">
      <Menu.Trigger asChild>
        <Button size="icon" variant="ghost" aria-label={uiText.text_1e0263ee04dd}>
          <MoreVertical size={22} />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={`dropdown ${t.theme} ${t.menu}`} sideOffset={8} align="end">
          <Menu.Item asChild>
            <Link href={`/personal/messages/${id}/info`}>
              <Info size={20} />
              {uiText.text_3a3510c0ba99}
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link href={`/personal/messages/${id}/media`}>
              <Files size={20} />
              {uiText.text_563cba00d087}
            </Link>
          </Menu.Item>
          {managed && (
            <Menu.Item asChild>
              <Link href={`/personal/messages/${id}/settings`}>
                <Settings size={20} />
                {uiText.text_ad01ea1c94b6}
              </Link>
            </Menu.Item>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
