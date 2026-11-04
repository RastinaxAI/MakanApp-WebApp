'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useState, useRef } from 'react';
import {
  BotMessageSquare,
  FileText,
  AlignLeft,
  Lightbulb,
  CalendarDays,
  ChevronLeft,
  ArrowUp,
} from 'lucide-react';
import { AssistantSourceConnection } from '@/features/personal/sources/assistant-connection';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePersonal } from '@/features/personal/provider';
import { useViewState } from '@/components/hooks/use-view-state';
import { useScrollMemory } from '@/components/navigation/scroll-memory';
import './blueprints.css';
import './screen.css';
import s from './assistant-surface.module.css';

export function ReferenceAssistant({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const { session } = usePersonal(),
    [picker, setPicker] = useState(false);
  const scroll = useRef<HTMLDivElement | null>(null);
  useScrollMemory(scroll, 'MK-38');
  const memory = 'makan:draft:view:' + session.user.id + ':' + session.revision + ':assistant:';
  const [sources, setSources] = useViewState<{ id: string; title: string }[]>(
    memory + 'sources',
    [],
    (v): v is { id: string; title: string }[] =>
      Array.isArray(v) &&
      v.every(
        (x) =>
          x &&
          typeof x.id === 'string' &&
          typeof x.title === 'string' &&
          /^[0-9a-f-]{36}$/i.test(x.id),
      ),
  );
  const [draft, setDraft] = useViewState(
      memory + 'question',
      '',
      (v): v is string => typeof v === 'string' && v.length <= 20000,
    ),
    [notice, setNotice] = useState('');
  function send(question = draft) {
    if (!question.trim()) {
      setNotice(uiText.text_1a92b2d7cdb7);
      return;
    }
    setDraft(question);
    if (!sources.length) {
      setPicker(true);
      return;
    }
    setNotice(uiText.text_6139467e7004);
  }
  const body = (
    <div className={`app-body ${s.body}`} ref={scroll}>
      <div className="card hero flex">
        <span className="accent">
          <BotMessageSquare size={24} />
        </span>
        <div className="grow">
          <h3>{uiText.text_66503f485eaf}</h3>
          <p>{uiText.text_a6a7443500cb}</p>
        </div>
      </div>
      <section className="card">
        <div className="section-title">
          <span>{uiText.text_9d0fb0d433db}</span>
          <button className="text-action" onClick={() => setPicker(true)}>
            {uiText.text_e1174ae8f3c8}
          </button>
        </div>
        {sources.length ? (
          <div className="list" style={{ border: 0 }}>
            {sources.map((source) => (
              <div className="row" key={source.id}>
                <FileText size={22} />
                <div className="grow">
                  <h4>{source.title}</h4>
                  <p>{uiText.text_df889c883c4e}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>{uiText.text_9cd73d4302b4}</p>
        )}
      </section>
      <h2 className="section-title">{uiText.text_10d22840ab00}</h2>
      <div className="list">
        {[
          {
            title: uiText.text_bdf39bdb81b6,
            detail: uiText.text_e9c385cbd890,
            icon: AlignLeft,
          },
          { title: uiText.text_2cd3e89872c5, detail: uiText.text_f8031fc55c47, icon: Lightbulb },
          {
            title: uiText.text_f601ed0900bc,
            detail: uiText.text_a9598b86b1bf,
            icon: CalendarDays,
          },
        ].map((item) => (
          <button className="row" key={item.title} onClick={() => send(item.title)}>
            <span className="tile-icon">
              <item.icon size={22} />
            </span>
            <span className="grow">
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
            </span>
            <ChevronLeft size={18} />
          </button>
        ))}
      </div>
      <div className="spacer" />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          className="compose-input"
          aria-label={uiText.text_c3fd8e948061}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={uiText.text_70c689cb669f}
        />
        <button className="ibtn" type="submit" aria-label={uiText.text_a3dd80a69e93}>
          <ArrowUp size={22} />
        </button>
      </form>
      <p className="tiny muted center">{uiText.text_26c05e2e974e}</p>
      <Link className="text-action center" href="/personal/assistant/studio">
        {uiText.text_2554cf297576}
      </Link>
    </div>
  );
  return (
    <>
      <div className={`mk-ui ${s.surface}`} data-mk-view="MK-38">
        {body}
      </div>
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent title={uiText.text_821faf6af612} description={uiText.text_9bd9d24ad223}>
          <AssistantSourceConnection
            initialSelected={sources.map((source) => source.id)}
            initialItems={sources}
            onSelectionChange={setSources}
          />
          <div className="confirm-actions">
            <Button onClick={() => setPicker(false)}>
              {uiText.text_370b22bdbc16}
              {sources.length.toLocaleString('fa-IR')}
              {uiText.text_2413fa113cc0}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!notice}
        onOpenChange={(open) => {
          if (!open) setNotice('');
        }}
      >
        <DialogContent title={uiText.text_a6d0f49fd8fe}>
          <p>{notice}</p>
          <div className="confirm-actions">
            <Button onClick={() => setNotice('')}>{uiText.text_b90ffe172b6d}</Button>
            {previewEnabled && (
              <Button asChild variant="outline">
                <Link href="/preview/reference/MK-40">{uiText.text_8345a971afa5}</Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
