'use client';
import { PageBack } from '@/components/navigation/page-back';
import { ActivityDeliveryStatus } from './activity-delivery';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { Download, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { schoolRoutes } from '@/config/navigation';
import { ApiError } from '@/lib/api/errors';
import { useEffect, useRef, useState } from 'react';
import { formatFileSize } from '../messaging/media-model';
import { usePersonal, usePersonalApi } from '../provider';
import { ReferenceColumns } from '../reference-layout';
import f from './reference-form.module.css';
import { schoolQuery, SchoolSearch } from './directory';
import s from './school.module.css';
import { base, Card, Field, Pager, SchoolHeading, useSchoolAction } from './shared';
import { LessonAttachmentEditor, type EditorAttachment } from './lesson-attachments';
import attachmentsStyle from './lesson-attachments.module.css';
type S = components['schemas'];

export function ResourcesClasses() {
  const q = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  return (
    <>
      <SchoolHeading
        title="درس و جزوه"
        description="کلاس را انتخاب کنید تا محتوای آموزشی مجاز آن را ببینید."
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title="کلاسی برای نمایش محتوا ندارید" />
      ) : (
        <div className={s.grid}>
          {q.data.map((c) => (
            <article className={s.classCard} key={c.id}>
              <h2>{c.title}</h2>
              <p>
                {c.courseTitle} · {c.academicPeriodTitle}
              </p>
              <footer className={s.cardActions}>
                <Button asChild>
                  <Link
                    href={`${base}/classes/${c.id}?tab=lessons`}
                    aria-label={'درس‌ها و جزوه‌های کلاس ' + c.title}
                  >
                    درس‌ها و جزوه‌های کلاس
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function ClassLessons({ classId, teach }: { classId: string; teach: boolean }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const q = usePersonalApi<S['SchoolPageOfClassLessonResult']>(
    `/api/v1/academic/classes/${classId}/lessons?` + schoolQuery(page, search),
    { poll: 10000 },
  );
  return (
    <Card
      title="درس‌ها و جزوه‌های کلاس"
      action={
        teach && (
          <Button asChild>
            <Link href={schoolRoutes.lessonNew(classId)}>ایجاد درس و جزوه</Link>
          </Button>
        )
      }
    >
      <SchoolSearch
        label="جستجوی درس و جزوه"
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {!q.data.items.length ? (
            <EmptyState
              title="محتوایی برای نمایش نیست"
              description={
                teach
                  ? 'درس را آماده کنید و پس از بازبینی منتشر کنید.'
                  : 'محتوای منتشرشدهٔ این کلاس اینجا نمایش داده می‌شود.'
              }
            />
          ) : (
            <div className={s.editorList}>
              {q.data.items.map((l) => (
                <article key={l.id} className={s.classCard}>
                  <h3>{l.title}</h3>
                  <p>
                    {label(l.status)} · {l.attachments.length} پیوست
                  </p>
                  <footer className={s.cardActions}>
                    <Button asChild>
                      <Link href={base + '/lessons/' + l.id} aria-label={'مشاهدهٔ درس ' + l.title}>
                        مشاهدهٔ درس
                      </Link>
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          )}
          <Pager
            page={q.data.page}
            size={q.data.pageSize}
            total={q.data.totalCount}
            onChange={setPage}
          />
        </>
      )}
    </Card>
  );
}
export function LessonDetail({
  id,
  teach,
  review = false,
}: {
  id: string;
  teach: boolean;
  review?: boolean;
}) {
  const q = usePersonalApi<S['ClassLessonResult']>('/api/v1/academic/lessons/' + id, {
    poll: 5000,
  });
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const lesson = q.data;
  return (
    <>
      <SchoolHeading title={lesson.title} description={label(lesson.status)} />
      <PageBack href={`${base}/classes/${lesson.classId}?tab=lessons`} />
      <Card>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 2 }} dir="auto">
          {lesson.body}
        </p>
        <div className={s.editorList}>
          {lesson.attachments.map((asset) => (
            <LessonDownload key={asset.fileAssetId} lessonId={id} asset={asset} />
          ))}
        </div>
      </Card>
      {teach && lesson.status === 'Draft' && (
        <>
          <Button asChild variant="outline">
            <Link href={schoolRoutes.lessonEdit(id)}>ویرایش پیش‌نویس</Link>
          </Button>
          {!review && (
            <Button asChild>
              <Link href={schoolRoutes.lessonReview(id)}>بازبینی و انتشار درس</Link>
            </Button>
          )}
          {review && (
            <Button
              disabled={a.busy}
              onClick={() => {
                if (
                  window.confirm(
                    'این درس برای دانش‌آموزان کلاس منتشر شود؟ پس از انتشار قابل ویرایش نیست.',
                  )
                )
                  void a.run(`/api/v1/academic/lessons/${id}/publish`, {
                    expectedVersion: lesson.version,
                  });
              }}
            >
              انتشار درس
            </Button>
          )}
          {a.feedback}
        </>
      )}
      {teach && lesson.status === 'Published' && (
        <>
          <p className={s.hint}>این درس منتشر شده است و ویرایش آن در این نسخه امکان‌پذیر نیست.</p>
          <ActivityDeliveryStatus classId={lesson.classId} kind="Lesson" />
        </>
      )}
    </>
  );
}
export function LessonFormPage({ classId, id }: { classId?: string; id?: string }) {
  const { session } = usePersonal(),
    router = useRouter(),
    cache = useQueryClient();
  const q = usePersonalApi<S['ClassLessonResult']>(`/api/v1/academic/lessons/${id}`, {
    enabled: !!id,
  });
  if (!['Teacher', 'Manager'].includes(session.context.activeRole ?? ''))
    return <ErrorState error={new ApiError(403)} />;
  if (id && q.isPending) return <LoadingSkeleton />;
  if (id && q.isError) return <ErrorState error={q.error} />;
  if (
    id &&
    (q.data?.status !== 'Draft' || q.data.organizationId !== session.context.organizationId)
  )
    return <ErrorState error={new ApiError(403)} />;
  return (
    <div className={s.flowPage} data-school-form>
      <h1 className="sr-only">{id ? 'ویرایش پیش‌نویس' : 'ایجاد درس و جزوه'}</h1>
      <ReferenceColumns form>
        <p className={f.intro}>{id ? 'پیش‌نویس را کامل کنید.' : 'یک موضوع روشن، یک درس تازه.'}</p>
        <LessonEditor
          key={id ?? classId}
          classId={classId ?? q.data!.classId}
          original={id ? q.data : undefined}
          onSaved={async (value) => {
            const key = [
              'personal',
              session.user.id,
              session.revision,
              `/api/v1/academic/lessons/${value.id}`,
            ];
            await cache.cancelQueries({ queryKey: key });
            cache.setQueryData(key, value);
            router.push(schoolRoutes.lessonReview(value.id));
          }}
        />
      </ReferenceColumns>
    </div>
  );
}
function LessonDownload({
  lessonId,
  asset,
}: {
  lessonId: string;
  asset: S['LessonAttachmentResult'];
}) {
  const { transfer } = usePersonal();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [progress, setProgress] = useState<TransferProgress>();
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  return (
    <div className={attachmentsStyle.download}>
      <span className={attachmentsStyle.fileIcon}>
        <Paperclip size={22} />
      </span>
      <div>
        <strong dir="auto">{asset.fileName}</strong>
        <small>{formatFileSize(asset.sizeBytes)}</small>
      </div>
      <Button
        disabled={busy || !asset.isAvailable || asset.status !== 'Ready'}
        onClick={async () => {
          setBusy(true);
          setError(undefined);
          const controller = new AbortController();
          abort.current = controller;
          try {
            const blob = await transfer<Blob>(
              `/api/client/school-files/${asset.fileAssetId}/content?lessonId=${lessonId}`,
              {
                signal: controller.signal,
                binary: true,
                expectedBytes: asset.sizeBytes,
                onProgress: setProgress,
              },
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = asset.fileName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (e) {
            if (!(e instanceof Error && e.name === 'AbortError')) setError(e);
          } finally {
            if (!controller.signal.aborted) setBusy(false);
          }
        }}
      >
        <Download size={16} />
        {busy
          ? 'در حال دریافت…'
          : asset.isAvailable && asset.status === 'Ready'
            ? 'دریافت فایل'
            : 'فایل هنوز آمادهٔ دریافت نیست'}
      </Button>
      {busy && (
        <>
          <progress
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
            aria-label="پیشرفت دریافت جزوه"
          />
          <Button
            variant="ghost"
            onClick={() => {
              abort.current?.abort();
              setBusy(false);
            }}
          >
            لغو دریافت
          </Button>
        </>
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
function LessonEditor({
  classId,
  original,
  onSaved,
}: {
  classId: string;
  original?: S['ClassLessonResult'];
  onSaved?: (value: S['ClassLessonResult']) => Promise<void>;
}) {
  const { transfer } = usePersonal();
  const [baseVersion] = useState(original?.version);
  const [title, setTitle] = useState(original?.title ?? ''),
    [body, setBody] = useState(original?.body ?? ''),
    [order, setOrder] = useState(original?.displayOrder ?? 1);
  const [assets, setAssets] = useState<EditorAttachment[]>(
    original?.attachments.map((a) => ({
      id: a.fileAssetId,
      name: a.fileName,
      sizeBytes: a.sizeBytes,
      contentType: a.contentType,
      status: a.status,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState<unknown>(),
    [created, setCreated] = useState<S['ClassLessonResult']>();
  const [pending, setPending] = useState<S['FileAssetResult']>();
  const [progress, setProgress] = useState<TransferProgress>();
  const abort = useRef<AbortController | null>(null);
  const uploadLock = useRef(false);
  const [frozen, setFrozen] = useState<S['CreateClassLessonCommand'] | null>(null);
  const a = useSchoolAction();
  useUnsavedChanges(
    !created &&
      (uploading ||
        !!pending ||
        title !== (original?.title ?? '') ||
        body !== (original?.body ?? '') ||
        order !== (original?.displayOrder ?? 1) ||
        assets.map((a) => a.id).join(',') !==
          (original?.attachments.map((a) => a.fileAssetId).join(',') ?? '')),
  );
  useEffect(() => () => abort.current?.abort(), []);
  function accept(asset: S['FileAssetResult']) {
    if (asset.status !== 'Ready') {
      setPending(asset);
      return;
    }
    setAssets((old) =>
      old.some((a) => a.id === asset.id)
        ? old
        : [
            ...old,
            {
              id: asset.id,
              name: asset.originalFileName,
              sizeBytes: asset.sizeBytes,
              contentType: asset.contentType,
              status: asset.status,
            },
          ],
    );
    setPending(undefined);
  }
  async function upload(file?: File) {
    if (uploadLock.current || a.busy || frozen) return;
    if (file && !file.size) {
      setError(new ApiError(400, { code: 'FILE_EMPTY' }));
      return;
    }
    uploadLock.current = true;
    setUploading(true);
    setProgress(undefined);
    setError(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      if (file) {
        const form = new FormData();
        form.append('File', file);
        accept(
          await transfer<S['FileAssetResult']>(`/api/client/school-files?classId=${classId}`, {
            method: 'POST',
            body: form,
            signal: controller.signal,
            onProgress: setProgress,
          }),
        );
      } else if (pending)
        accept(
          await transfer<S['FileAssetResult']>(
            `/api/client/school-files/${pending.id}?classId=${classId}`,
            { signal: controller.signal },
          ),
        );
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) setError(e);
    } finally {
      if (abort.current === controller) {
        uploadLock.current = false;
        setUploading(false);
      }
    }
  }
  if (created)
    return (
      <div className={s.receipt}>
        <h2>پیش‌نویس ذخیره شد</h2>
        <Button asChild>
          <Link href={base + '/lessons/' + created.id}>بازبینی و انتشار درس</Link>
        </Button>
      </div>
    );
  return (
    <form
      className={f.body}
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        const fields = {
          title: title.trim(),
          body: body.trim() || null,
          displayOrder: order,
          fileAssetIds: assets.map((a) => a.id),
        };
        const command = frozen ?? { ...fields, clientOperationId: crypto.randomUUID() };
        if (!original) setFrozen(command);
        const result = await a.run<S['ClassLessonResult']>(
          original
            ? `/api/v1/academic/lessons/${original.id}`
            : `/api/v1/academic/classes/${classId}/lessons`,
          original ? { ...fields, expectedVersion: baseVersion } : command,
          original ? 'PATCH' : 'POST',
        );
        if (result) {
          if (onSaved) await onSaved(result);
          else setCreated(result);
        }
      }}
    >
      <fieldset disabled={a.busy || uploading || !!frozen}>
        <Field label="عنوان درس و جزوه">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="متن درس">
          <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="ترتیب نمایش">
          <input
            type="number"
            required
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </Field>
      </fieldset>
      <LessonAttachmentEditor
        assets={assets}
        pending={pending}
        uploading={uploading}
        disabled={a.busy || !!frozen}
        progress={progress}
        error={error}
        onPick={(file) => void upload(file)}
        onRemove={(id) => setAssets((old) => old.filter((asset) => asset.id !== id))}
        onCancel={() => abort.current?.abort()}
        onCheck={() => void upload()}
        onDismiss={() => setPending(undefined)}
      />
      <div className={f.actions}>
        <Button type="submit" disabled={a.busy || uploading || !!pending || !title.trim()}>
          {frozen ? 'بررسی دوبارهٔ همان پیش‌نویس' : 'ذخیرهٔ پیش‌نویس'}
        </Button>
        <PageBack href={`${base}/classes/${classId}?tab=lessons`} />
      </div>
      {!!a.error && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFrozen(null);
            setError(undefined);
          }}
        >
          ویرایش اطلاعات پیش‌نویس
        </Button>
      )}

      {a.feedback}
    </form>
  );
}
