'use client';
import * as uiText from '@/content/fa';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { number } from '@/lib/formatting';
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  FileText,
  Headphones,
  Layers,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Network,
  Plus,
  Bot,
  StickyNote,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import s from './assistant.module.css';
import { AssistantSourceConnection } from './sources/assistant-connection';
type Source = { id: number; title: string; kind: string; excerpt: string };
const sampleSources: Source[] = [
  {
    id: 1,
    title: uiText.text_1a892edc1838,
    kind: uiText.text_0adfcda5e4b9,
    excerpt: uiText.text_f47db0e19977,
  },
  {
    id: 2,
    title: uiText.text_f2e9bbc90dc7,
    kind: uiText.text_e1cce87dadcb,
    excerpt: uiText.text_54ff7685e1c1,
  },
  {
    id: 3,
    title: uiText.text_7ed6fdbd51db,
    kind: uiText.text_460a4047ff59,
    excerpt: uiText.text_c0bd763a2d58,
  },
];
const tools = [
  {
    id: 'summary',
    title: uiText.text_6db905812233,
    detail: uiText.text_5ffcdcf1418f,
    icon: FileText,
  },
  { id: 'cards', title: uiText.text_72536904ad94, detail: uiText.text_5e6630dbb06e, icon: Layers },
  {
    id: 'quiz',
    title: uiText.text_fd4cfc32a485,
    detail: uiText.text_70d6ba9db6ab,
    icon: ListChecks,
  },
  { id: 'map', title: uiText.text_b1faa8fffe50, detail: uiText.text_a6cfd50bbe46, icon: Network },
  {
    id: 'audio',
    title: uiText.text_4a5e94c41f2f,
    detail: uiText.text_cfe0abc887ca,
    icon: Headphones,
  },
  {
    id: 'guide',
    title: uiText.text_c2f0032b35be,
    detail: uiText.text_0e5acde2ffd7,
    icon: Lightbulb,
  },
];
export function MakanAssistant() {
  const [demo, setDemo] = useState(false),
    [tab, setTab] = useState('chat'),
    [selected, setSelected] = useState<Set<number>>(() => new Set([1, 2, 3])),
    [draft, setDraft] = useState('');
  const [conversation, setConversation] = useState<{ question: string; sources: Source[] }[]>([]),
    [notes, setNotes] = useState<string[]>([]);
  const [detail, setDetail] = useState<{ title: string; content: ReactNode } | null>(null);
  const opener = useRef<HTMLElement | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const chosen = sampleSources.filter((item) => selected.has(item.id));
  function show(title: string, content: ReactNode, trigger: HTMLElement) {
    opener.current = trigger;
    setDetail({ title, content });
  }
  function send(question: string) {
    if (!demo || !chosen.length || !question.trim()) return;
    setConversation((previous) => [...previous, { question: question.trim(), sources: chosen }]);
    setDraft('');
    requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: 'nearest' }));
  }
  function sourceDetails(source: Source, trigger: HTMLElement) {
    show(
      source.title,
      <>
        <span className={s.samplePill}>{uiText.text_7e554f8878f0}</span>
        <p className={s.excerpt}>{source.excerpt}</p>
        <p className={s.small}>{uiText.text_e3b5971a5cc0}</p>
      </>,
      trigger,
    );
  }
  function studio(id: string, title: string, trigger: HTMLElement) {
    if (!demo) {
      show(
        title,
        <div className={s.activation}>
          <Bot size={32} />
          <h3>{uiText.text_38983ac5551d}</h3>
          <p>{uiText.text_fc68119ba419}</p>
          <button
            onClick={() => {
              setDemo(true);
              setDetail(null);
            }}
          >
            {uiText.text_2d2a6bc9349c}
          </button>
        </div>,
        trigger,
      );
      return;
    }
    const body =
      id === 'cards' ? (
        <SampleFlashcards />
      ) : id === 'quiz' ? (
        <SampleQuiz />
      ) : id === 'map' ? (
        <div className={s.mindMap}>
          <strong>{uiText.text_f08a9801ceef}</strong>
          <div>
            {[
              uiText.text_fc25f14c183d,
              uiText.text_20376e24cc20,
              uiText.text_e84e0fb134d4,
              uiText.text_fd88424c55fd,
            ].map((text) => (
              <span key={text}>{text}</span>
            ))}
          </div>
        </div>
      ) : id === 'audio' ? (
        <div className={s.activation}>
          <Headphones size={36} />
          <h3>{uiText.text_8af6997cd79d}</h3>
          <p>{uiText.text_f33ab5c7b3dd}</p>
        </div>
      ) : (
        <div className={s.excerpt}>
          <h3>{id === 'summary' ? uiText.text_0da122fa3614 : uiText.text_afd7d663b964}</h3>
          <p>{id === 'summary' ? sampleSources[0].excerpt : uiText.text_fc6afe072fc3}</p>
          <blockquote>{sampleSources[1].excerpt}</blockquote>
        </div>
      );
    show(
      title,
      <>
        <span className={s.samplePill}>{uiText.text_96fdb70b6062}</span>
        {body}
      </>,
      trigger,
    );
  }
  return (
    <div className={s.assistant} data-assistant>
      <h1 className="sr-only">{uiText.text_7168b7bf2f42}</h1>
      <div className={s.tabs} role="tablist" aria-label={uiText.text_9b37b15e9cb4}>
        {[
          { id: 'sources', title: uiText.text_3b15ef5a6e60, icon: BookOpen },
          { id: 'chat', title: uiText.text_4172b29c8925, icon: MessageCircle },
          { id: 'studio', title: uiText.text_2c38482cbb71, icon: Bot },
        ].map((item) => (
          <button
            key={item.id}
            id={'assistant-tab-' + item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={'assistant-panel-' + item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={(event) => {
              const ids = ['sources', 'chat', 'studio'];
              const index = ids.indexOf(item.id);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 2
                    : event.key === 'ArrowLeft'
                      ? (index + 1) % 3
                      : event.key === 'ArrowRight'
                        ? (index + 2) % 3
                        : null;
              if (next === null) return;
              event.preventDefault();
              setTab(ids[next]);
              document.getElementById('assistant-tab-' + ids[next])?.focus();
            }}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={17} />
            {item.title}
          </button>
        ))}
      </div>
      <div className={s.workbench}>
        <section
          id="assistant-panel-sources"
          aria-label={uiText.text_d10c65961f64}
          className={`${s.sources} ${tab === 'sources' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <BookOpen size={18} />
              {uiText.text_3b15ef5a6e60}
            </h2>
            <span>{demo ? number(sampleSources.length) : uiText.text_9b5548a0482d}</span>
          </div>
          <button
            className={s.addSource}
            onClick={(event) =>
              show(
                uiText.text_1d488a965baa,
                <div className={s.activation}>
                  <BookOpen size={34} />
                  <h3>{uiText.text_b3b6ab6c3b7f}</h3>
                  <p>{uiText.text_2daaecb60c15}</p>
                  <button
                    onClick={() => {
                      setDemo(true);
                      setDetail(null);
                    }}
                  >
                    {uiText.text_88e5ddd3c318}
                  </button>
                </div>,
                event.currentTarget,
              )
            }
          >
            <Plus size={19} />
            {uiText.text_1d488a965baa}
          </button>
          <AssistantSourceConnection />
          {demo ? (
            <>
              <label className={s.selectAll}>
                <input
                  type="checkbox"
                  checked={selected.size === sampleSources.length}
                  onChange={(event) =>
                    setSelected(
                      new Set(event.target.checked ? sampleSources.map((item) => item.id) : []),
                    )
                  }
                />
                {uiText.text_47350c3ef300}
              </label>
              <div className={s.sourceList}>
                {sampleSources.map((source) => (
                  <article key={source.id}>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={uiText.text_89e9053371c8 + source.title}
                        checked={selected.has(source.id)}
                        onChange={(event) =>
                          setSelected((previous) => {
                            const next = new Set(previous);
                            if (event.target.checked) next.add(source.id);
                            else next.delete(source.id);
                            return next;
                          })
                        }
                      />
                    </label>
                    <button onClick={(event) => sourceDetails(source, event.currentTarget)}>
                      <FileText size={20} />
                      <span>
                        <strong>{source.title}</strong>
                        <small>{source.kind}</small>
                      </span>
                    </button>
                  </article>
                ))}
              </div>
              <div className={s.sourceTip}>
                <Lightbulb size={19} />
                <p>{uiText.text_ceb7a80a0b63}</p>
              </div>
            </>
          ) : (
            <div className={s.sourceEmpty}>
              <span>
                <FileText size={30} />
              </span>
              <h3>{uiText.text_a3056b93b3de}</h3>
              <p>{uiText.text_733d4da7dbb7}</p>
              <button onClick={() => setDemo(true)}>
                {uiText.text_b46673243f8e}
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
          <footer className={s.sourceFooter}>
            {demo ? number(chosen.length) + uiText.text_92392a6f95ab : uiText.text_074439484fe9}
          </footer>
        </section>
        <section
          id="assistant-panel-chat"
          aria-label={uiText.text_dfac17a65e7a}
          className={`${s.chat} ${tab === 'chat' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <MessageCircle size={18} />
              {uiText.text_4172b29c8925}
            </h2>
            <span className={s.privateLabel}>
              {demo ? uiText.text_a92a3df4a112 : uiText.text_f309d92e2d72}
            </span>
          </div>
          <div className={s.chatBody}>
            {!conversation.length || !demo ? (
              <div className={s.welcome}>
                <div className={s.orb}>
                  <Bot size={42} />
                  <i />
                  <i />
                </div>
                <span className={s.eyebrow}>{uiText.text_a7a964d74a5f}</span>
                <h2>
                  {uiText.text_66c6f479a6cb}
                  <br />
                  <em>{uiText.text_47867d703d42}</em>
                </h2>
                <p>{demo ? uiText.text_7e4e81d1931f : uiText.text_e4d0e396c63c}</p>
                <div className={s.promptGrid}>
                  {[
                    uiText.text_6388a1ee7308,
                    uiText.text_c84904d0e08b,
                    uiText.text_147fe2c1e343,
                  ].map((prompt) => (
                    <button key={prompt} onClick={() => (demo ? send(prompt) : setDemo(true))}>
                      <span>{prompt}</span>
                      <ArrowLeft size={17} />
                    </button>
                  ))}
                </div>
                {!demo && <p className={s.small}>{uiText.text_da84fe1b1072}</p>}
              </div>
            ) : (
              <div className={s.answers}>
                {conversation.map((item, index) => (
                  <div key={index}>
                    <p className={s.question}>{item.question}</p>
                    <article className={s.answer} data-assistant-response>
                      <span className={s.answerBrand}>
                        <Bot size={18} />
                        {uiText.text_6866c8be836f}
                        <small>{uiText.text_7303ff111f09}</small>
                      </span>
                      <p>{uiText.text_23a7aa8d1e70}</p>
                      {item.sources.map((source) => (
                        <p key={source.id}>
                          {source.excerpt}
                          <button
                            className={s.citation}
                            aria-label={uiText.text_a44139def117 + source.id}
                            onClick={(event) => sourceDetails(source, event.currentTarget)}
                          >
                            {number(source.id)}
                          </button>
                        </p>
                      ))}
                      <button
                        className={s.saveNote}
                        onClick={() =>
                          setNotes((previous) => [
                            ...previous,
                            item.sources.map((source) => source.excerpt).join('\n'),
                          ])
                        }
                      >
                        <StickyNote size={16} />
                        {uiText.text_ec84052031a5}
                      </button>
                    </article>
                  </div>
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className={s.composerWrap}>
            <form
              className={s.composer}
              onSubmit={(event) => {
                event.preventDefault();
                send(draft);
              }}
            >
              <input
                type="text"
                autoComplete="off"
                aria-label={uiText.text_9cd586907a1f}
                placeholder={demo ? uiText.text_3a48a21e60d2 : uiText.text_19d70e40664b}
                value={draft}
                disabled={!demo}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.nativeEvent.isComposing)
                    event.preventDefault();
                }}
              />
              <button
                type="submit"
                aria-label={uiText.text_f78d14e6ce59}
                disabled={!demo || !draft.trim() || !chosen.length}
              >
                <ArrowUp size={21} />
              </button>
            </form>
            <p>{demo ? uiText.text_00a188a1a0ae : uiText.text_a785deedc049}</p>
          </div>
        </section>
        <section
          id="assistant-panel-studio"
          aria-label={uiText.text_aceecadc2cd5}
          className={`${s.studio} ${tab === 'studio' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <Bot size={18} />
              {uiText.text_2c38482cbb71}
            </h2>
            <span className={s.studioBadge}>{uiText.text_8f45e8da411d}</span>
          </div>
          <p className={s.studioIntro}>{uiText.text_1f9ae852e049}</p>
          <div className={s.toolGrid}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={(event) => studio(tool.id, tool.title, event.currentTarget)}
              >
                <span>
                  <tool.icon size={23} />
                </span>
                <strong>{tool.title}</strong>
                <small>{tool.detail}</small>
              </button>
            ))}
          </div>
          <div className={s.notesHeading}>
            <h3>{uiText.text_700e0dc89890}</h3>
            <span>{number(notes.length)}</span>
          </div>
          {notes.length ? (
            <div className={s.notes}>
              {notes.map((note, index) => (
                <button
                  key={index}
                  onClick={(event) =>
                    show(
                      uiText.text_854483bf1036,
                      <p className={s.excerpt}>{note}</p>,
                      event.currentTarget,
                    )
                  }
                >
                  <StickyNote size={18} />
                  <span>
                    {note.slice(0, 70)}
                    {uiText.text_b4935894c8ce}
                  </span>
                  <ChevronLeft size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className={s.noteEmpty}>
              <StickyNote size={26} />
              <p>{uiText.text_1440b0963cde}</p>
            </div>
          )}
          <p className={s.small}>{uiText.text_c1f6661907f4}</p>
        </section>
      </div>
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        {detail && (
          <DialogContent
            className={s.outputDialog}
            title={detail.title}
            description={demo ? uiText.text_edf8ab126e8a : uiText.text_7168b7bf2f42}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            {detail.content}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
function SampleFlashcards() {
  const [flipped, setFlipped] = useState(false),
    [index, setIndex] = useState(0);
  const cards = [
    { question: uiText.text_c356c5795ec2, answer: uiText.text_77965539787c },
    { question: uiText.text_72d55d7f6343, answer: uiText.text_cdf8a680b26d },
    { question: uiText.text_b79d6aa8e2be, answer: uiText.text_ae5ed820017c },
  ];
  return (
    <div className={s.flashcards}>
      <small>
        {number(index + 1)}
        {uiText.text_a624a1e41ffd}
        {number(cards.length)}
      </small>
      <button aria-label={uiText.text_6c4bd5ff0464} onClick={() => setFlipped(!flipped)}>
        <Layers size={28} />
        <strong>{flipped ? cards[index].answer : cards[index].question}</strong>
        <span>{flipped ? uiText.text_41539e7b1611 : uiText.text_22c7dc610a49}</span>
      </button>
      <button
        onClick={() => {
          setIndex((index + 1) % cards.length);
          setFlipped(false);
        }}
      >
        {uiText.text_37ac8a217a0d}
        <ArrowLeft size={17} />
      </button>
    </div>
  );
}
function SampleQuiz() {
  const [answer, setAnswer] = useState<string | null>(null);
  return (
    <div className={s.quiz}>
      <h3>{uiText.text_e6a1b6a2b7c8}</h3>
      {[uiText.text_9a26ac6c7cc9, uiText.text_dc1f941e46e2, uiText.text_ae5ed820017c].map(
        (item) => (
          <button key={item} aria-pressed={answer === item} onClick={() => setAnswer(item)}>
            {item}
            {answer === item && <Check size={18} />}
          </button>
        ),
      )}
      {answer && (
        <p role="status">
          {answer === uiText.text_dc1f941e46e2
            ? uiText.text_bbbed45bce72
            : uiText.text_fcbec29a8d08}
        </p>
      )}
    </div>
  );
}
