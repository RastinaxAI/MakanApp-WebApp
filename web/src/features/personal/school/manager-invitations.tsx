'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { ArrowLeft, FolderSync, UserRoundPlus, UsersRound } from 'lucide-react';
import { base, Card } from './shared';
import { ManagerPageHeader } from './manager-page-header';
import { InvitationsPage } from './invitations';
import s from './manager-workspace.module.css';
export function ManagerInvitations() {
  return (
    <div className={s.stack}>
      <ManagerPageHeader title={uiText.text_141ab31cbb75} description={uiText.text_69a24d13a391} />
      <nav className={s.invitationActions} aria-label={uiText.text_e61d50d522fa}>
        <Link className={s.primaryAction} href={base + '/guardians/new'}>
          <UserRoundPlus size={22} />
          <span>{uiText.text_afeb96c95c63}</span>
          <ArrowLeft size={17} />
        </Link>
        <Link href={base + '/people'}>
          <FolderSync size={22} />
          <span>{uiText.text_8987b66cfbc9}</span>
          <ArrowLeft size={17} />
        </Link>
        <Link href={base + '/members'}>
          <UsersRound size={22} />
          <span>{uiText.text_48eb62b1b116}</span>
          <ArrowLeft size={17} />
        </Link>
      </nav>
      <Card title={uiText.text_6b70a58fe33b}>
        <p className={s.hint}>{uiText.text_a458251385ff}</p>
      </Card>
      <InvitationsPage />
    </div>
  );
}
