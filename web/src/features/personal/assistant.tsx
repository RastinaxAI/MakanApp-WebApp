'use client';
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
  Sparkles,
  StickyNote,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import s from './assistant.module.css';
type Source = { id: number; title: string; kind: string; excerpt: string };
const sampleSources: Source[] = [
  {
    id: 1,
    title: 'ساختار و کار یاخته',
    kind: 'متن آموزشی · نمونه',
    excerpt:
      'یاخته واحد ساختاری و عملکردی جانداران است. غشای یاخته ورود و خروج مواد را تنظیم می‌کند. هسته اطلاعات وراثتی را در خود نگه می‌دارد و فعالیت‌های یاخته را هماهنگ می‌کند.',
  },
  {
    id: 2,
    title: 'یادداشت‌های کلاس زیست',
    kind: 'یادداشت · نمونه',
    excerpt:
      'بخش بزرگی از فعالیت‌های یاخته در سیتوپلاسم انجام می‌شود. میتوکندری در فراهم‌کردن انرژی نقش دارد. ریبوزوم محل ساخت پروتئین است. ارتباط ساختار هر اندامک با کار آن، به فهم بهتر یاخته کمک می‌کند.',
  },
  {
    id: 3,
    title: 'مرور نکته‌های فصل اول',
    kind: 'راهنمای مطالعه · نمونه',
    excerpt:
      'برای مرور فعال، نقش غشا، هسته، میتوکندری و ریبوزوم را با زبان خودتان توضیح دهید. پس از مطالعه، کتاب را ببندید و تفاوت نقش هر بخش را از حافظه بازگو کنید.',
  },
];
const tools = [
  { id: 'summary', title: 'خلاصهٔ هوشمند', detail: 'مهم‌ترین نکته‌ها', icon: FileText },
  { id: 'cards', title: 'فلش‌کارت', detail: 'مرور و یادآوری', icon: Layers },
  { id: 'quiz', title: 'خودت را بسنج', detail: 'پرسش و تمرین', icon: ListChecks },
  { id: 'map', title: 'نقشهٔ مفهومی', detail: 'ارتباط بین ایده‌ها', icon: Network },
  { id: 'audio', title: 'مرور شنیداری', detail: 'یادگیری با شنیدن', icon: Headphones },
  { id: 'guide', title: 'راهنمای مطالعه', detail: 'مسیر قدم‌به‌قدم', icon: Lightbulb },
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
        <span className={s.samplePill}>منبع نمونه</span>
        <p className={s.excerpt}>{source.excerpt}</p>
        <p className={s.small}>این متن، محتوای نمونهٔ مستقل برای بررسی رابط است.</p>
      </>,
      trigger,
    );
  }
  function studio(id: string, title: string, trigger: HTMLElement) {
    if (!demo) {
      show(
        title,
        <div className={s.activation}>
          <Sparkles size={32} />
          <h3>استودیوی شما اینجا شکل می‌گیرد</h3>
          <p>
            ساخت خروجی واقعی پس از فعال‌شدن سرویس دستیار و مشخص‌شدن منابع و اعتبار مصرفی در دسترس
            خواهد بود.
          </p>
          <button
            onClick={() => {
              setDemo(true);
              setDetail(null);
            }}
          >
            مشاهدهٔ محیط نمونه
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
          <strong>یاخته</strong>
          <div>
            {[
              'غشا: تنظیم تبادل',
              'هسته: اطلاعات وراثتی',
              'میتوکندری: انرژی',
              'ریبوزوم: ساخت پروتئین',
            ].map((text) => (
              <span key={text}>{text}</span>
            ))}
          </div>
        </div>
      ) : id === 'audio' ? (
        <div className={s.activation}>
          <Headphones size={36} />
          <h3>طرح مرور شنیداری</h3>
          <p>
            پخش صدای واقعی در این نمونه فعال نیست. در نسخهٔ متصل، فایل صوتیِ آماده‌شده و وضعیت تولید
            آن اینجا نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className={s.excerpt}>
          <h3>{id === 'summary' ? 'از ساختار تا عملکرد' : 'یک مسیر کوتاه برای مرور'}</h3>
          <p>
            {id === 'summary'
              ? sampleSources[0].excerpt
              : '۱. ساختارهای اصلی را بخوانید. ۲. برای هر بخش یک کاربرد بنویسید. ۳. بدون نگاه به متن پاسخ فلش‌کارت‌ها را بدهید. ۴. به نکته‌هایی که فراموش کردید برگردید.'}
          </p>
          <blockquote>{sampleSources[1].excerpt}</blockquote>
        </div>
      );
    show(
      title,
      <>
        <span className={s.samplePill}>خروجی نمونه · تولید AI نیست</span>
        {body}
      </>,
      trigger,
    );
  }
  return (
    <div className={s.assistant} data-assistant>
      <h1 className="sr-only">دستیار ماکان</h1>
      <div className={s.tabs} role="tablist" aria-label="بخش‌های دستیار">
        {[
          { id: 'sources', title: 'منابع', icon: BookOpen },
          { id: 'chat', title: 'گفتگو', icon: MessageCircle },
          { id: 'studio', title: 'استودیو', icon: Sparkles },
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
          aria-label="منابع دستیار"
          className={`${s.sources} ${tab === 'sources' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <BookOpen size={18} />
              منابع
            </h2>
            <span>{demo ? number(sampleSources.length) : '۰'}</span>
          </div>
          <button
            className={s.addSource}
            onClick={(event) =>
              show(
                'افزودن منبع',
                <div className={s.activation}>
                  <BookOpen size={34} />
                  <h3>مطالعه از منابع خودتان</h3>
                  <p>
                    افزودن و پردازش منبع واقعی هنوز فعال نیست. پس از فعال‌شدن سرویس، می‌توانید منابع
                    مجاز خود را انتخاب کنید.
                  </p>
                  <button
                    onClick={() => {
                      setDemo(true);
                      setDetail(null);
                    }}
                  >
                    بررسی با منابع نمونه
                  </button>
                </div>,
                event.currentTarget,
              )
            }
          >
            <Plus size={19} />
            افزودن منبع
          </button>
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
                انتخاب همهٔ منابع
              </label>
              <div className={s.sourceList}>
                {sampleSources.map((source) => (
                  <article key={source.id}>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={'انتخاب ' + source.title}
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
                <p>منبعی را انتخاب کنید که می‌خواهید در گفتگوی نمونه بررسی شود.</p>
              </div>
            </>
          ) : (
            <div className={s.sourceEmpty}>
              <span>
                <FileText size={30} />
              </span>
              <h3>هر فهم تازه، از یک منبع</h3>
              <p>کتاب، جزوه و یادداشت‌های شما، نقطهٔ شروع یادگیری‌اند.</p>
              <button onClick={() => setDemo(true)}>
                دیدن منابع نمونه <ChevronLeft size={16} />
              </button>
            </div>
          )}
          <footer className={s.sourceFooter}>
            {demo ? number(chosen.length) + ' منبع نمونه انتخاب شده' : 'هنوز منبعی انتخاب نشده'}
          </footer>
        </section>
        <section
          id="assistant-panel-chat"
          aria-label="گفتگو با دستیار"
          className={`${s.chat} ${tab === 'chat' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <MessageCircle size={18} />
              گفتگو
            </h2>
            <span className={s.privateLabel}>{demo ? 'محیط نمونه' : 'پیش‌نمایش'}</span>
          </div>
          <div className={s.chatBody}>
            {!conversation.length || !demo ? (
              <div className={s.welcome}>
                <div className={s.orb}>
                  <Sparkles size={42} />
                  <i />
                  <i />
                </div>
                <span className={s.eyebrow}>با کنجکاوی شروع کنید</span>
                <h2>
                  از منبع،
                  <br />
                  <em>تا فهمیدن.</em>
                </h2>
                <p>
                  {demo
                    ? 'بین ایده‌های یک فصل ارتباط پیدا کنید، نکته‌ها را مرور کنید و پرسش‌های تازه بسازید.'
                    : 'منابع خود را کنار هم بیاورید؛ بپرسید، کشف کنید و به زبان خودتان یاد بگیرید.'}
                </p>
                <div className={s.promptGrid}>
                  {[
                    'ایده‌های اصلی را خلاصه کن',
                    'این موضوع‌ها چه ارتباطی دارند؟',
                    'برای مرور، چند سؤال بساز',
                  ].map((prompt) => (
                    <button key={prompt} onClick={() => (demo ? send(prompt) : setDemo(true))}>
                      <span>{prompt}</span>
                      <ArrowLeft size={17} />
                    </button>
                  ))}
                </div>
                {!demo && (
                  <p className={s.small}>برای بررسی تعامل‌ها، «دیدن منابع نمونه» را انتخاب کنید.</p>
                )}
              </div>
            ) : (
              <div className={s.answers}>
                {conversation.map((item, index) => (
                  <div key={index}>
                    <p className={s.question}>{item.question}</p>
                    <article className={s.answer} data-assistant-response>
                      <span className={s.answerBrand}>
                        <Sparkles size={18} />
                        ماکان <small>پاسخ نمایشی</small>
                      </span>
                      <p>
                        این پاسخ نمونه برای بررسی رابط است. در نسخهٔ متصل، پرسش شما با منابع مجاز
                        انتخاب‌شده بررسی خواهد شد. بخشی از منابع انتخاب‌شده در این نمونه:
                      </p>
                      {item.sources.map((source) => (
                        <p key={source.id}>
                          {source.excerpt}
                          <button
                            className={s.citation}
                            aria-label={'مشاهدهٔ استناد ' + source.id}
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
                        افزودن به یادداشت‌های این نشست
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
                aria-label="پرسش از دستیار"
                placeholder={
                  demo ? 'دربارهٔ منابع نمونه بپرسید…' : 'پرسش‌های شما از اینجا شروع می‌شوند…'
                }
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
                aria-label="ارسال پرسش نمونه"
                disabled={!demo || !draft.trim() || !chosen.length}
              >
                <ArrowUp size={21} />
              </button>
            </form>
            <p>
              {demo
                ? 'پاسخ نمایشی است؛ اعتباری مصرف نمی‌شود.'
                : 'پیش‌نمایش دستیار؛ ارسال واقعی فعلاً فعال نیست.'}
            </p>
          </div>
        </section>
        <section
          id="assistant-panel-studio"
          aria-label="استودیوی دستیار"
          className={`${s.studio} ${tab === 'studio' ? s.paneActive : ''}`}
        >
          <div className={s.paneHeader}>
            <h2>
              <Sparkles size={18} />
              استودیو
            </h2>
            <span className={s.studioBadge}>از دانستن، به ساختن</span>
          </div>
          <p className={s.studioIntro}>منابع را به ابزار یادگیری تبدیل کنید.</p>
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
            <h3>یادداشت‌های این نشست</h3>
            <span>{number(notes.length)}</span>
          </div>
          {notes.length ? (
            <div className={s.notes}>
              {notes.map((note, index) => (
                <button
                  key={index}
                  onClick={(event) =>
                    show(
                      'یادداشت این نشست',
                      <p className={s.excerpt}>{note}</p>,
                      event.currentTarget,
                    )
                  }
                >
                  <StickyNote size={18} />
                  <span>{note.slice(0, 70)}…</span>
                  <ChevronLeft size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className={s.noteEmpty}>
              <StickyNote size={26} />
              <p>ایده‌ای که می‌خواهید نگه دارید، اینجا جای می‌گیرد.</p>
            </div>
          )}
          <p className={s.small}>یادداشت‌های نمونه با خروج از صفحه حفظ نمی‌شوند.</p>
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
            description={demo ? 'پیش‌نمایش دستیار ماکان؛ دادهٔ نمونه' : 'دستیار ماکان'}
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
    { question: 'کدام بخش، تبادل مواد را تنظیم می‌کند؟', answer: 'غشای یاخته' },
    { question: 'کدام اندامک در فراهم‌کردن انرژی نقش دارد؟', answer: 'میتوکندری' },
    { question: 'محل ساخت پروتئین کجاست؟', answer: 'ریبوزوم' },
  ];
  return (
    <div className={s.flashcards}>
      <small>
        {number(index + 1)} از {number(cards.length)}
      </small>
      <button aria-label="نمایش یا پنهان‌کردن پاسخ فلش‌کارت" onClick={() => setFlipped(!flipped)}>
        <Layers size={28} />
        <strong>{flipped ? cards[index].answer : cards[index].question}</strong>
        <span>{flipped ? 'برای دیدن سؤال بزنید' : 'برای دیدن پاسخ بزنید'}</span>
      </button>
      <button
        onClick={() => {
          setIndex((index + 1) % cards.length);
          setFlipped(false);
        }}
      >
        کارت بعدی <ArrowLeft size={17} />
      </button>
    </div>
  );
}
function SampleQuiz() {
  const [answer, setAnswer] = useState<string | null>(null);
  return (
    <div className={s.quiz}>
      <h3>کدام بخش، اطلاعات وراثتی را در خود نگه می‌دارد؟</h3>
      {['غشا', 'هسته', 'ریبوزوم'].map((item) => (
        <button key={item} aria-pressed={answer === item} onClick={() => setAnswer(item)}>
          {item}
          {answer === item && <Check size={18} />}
        </button>
      ))}
      {answer && (
        <p role="status">
          {answer === 'هسته' ? 'پاسخ نمونه درست است: هسته.' : 'در این مثال، پاسخ درست «هسته» است.'}
        </p>
      )}
    </div>
  );
}
