'use client';
import * as uiText from '@/content/fa';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReferenceScreen, referenceNodeKey, referenceBlueprint } from './screen';
/** A connected view keeps the reference's real header/layout and supplies authorized data. */
export function ReferenceFrame({
  id,
  title,
  subtitle,
  back = '/personal/profile',
  children,
}: {
  id: string;
  title?: string;
  subtitle?: string;
  back?: string;
  children: ReactNode;
}) {
  const router = useRouter(),
    [menu, setMenu] = useState(false);
  const body = referenceNodeKey(id, 'app-body'),
    footer = referenceNodeKey(id, 'fixed-actions'),
    backControl = referenceBlueprint(id).controls.find((c) => c.label === uiText.common_back);
  return (
    <>
      <ReferenceScreen
        id={id}
        bindings={{
          heading: { title, subtitle },
          navigation: backControl ? { [backControl.key]: back } : undefined,
          onChange: () => {},
          onAction: (c) => {
            if (c.label === uiText.common_back) router.push(back);
            else setMenu(true);
          },
          replacements: {
            ...(body
              ? { [body]: <div className="app-body mk-connected-body">{children}</div> }
              : {}),
            ...(footer ? { [footer]: null } : {}),
          },
        }}
      />
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent title={uiText.text_948f45c79043}>
          <div className="mk-menu-actions">
            <Button
              data-navigation-target="/personal/profile"
              onClick={() => router.push('/personal/profile')}
            >
              {uiText.text_33f4cefcfd71}
            </Button>
            <Button
              data-navigation-target="/personal/settings"
              variant="outline"
              onClick={() => router.push('/personal/settings')}
            >
              {uiText.navigation_settings}
            </Button>
            <Button variant="ghost" onClick={() => setMenu(false)}>
              {uiText.text_313cbecb4dd3}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
