/**
 * Image intake for the demo profile/space photo. No runtime dependency, and
 * nothing is stored until the picture has been shrunk to what the UI paints.
 */

import { h } from './dom';
import { icon } from './icons';
import { openSheet, toast } from './overlays';

/** 8 MB: generous for a phone photo, small enough to fail fast on a huge file. */
const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_MB = Math.round(MAX_BYTES / (1024 * 1024));

export interface AvatarResult {
  ok: boolean;
  /** Present when `ok`; a small JPEG data URL. */
  dataUrl?: string;
  /** Present when `!ok`; already written for the user. */
  message?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

/**
 * Cover-crop any picked picture into a square thumbnail. Centring the crop is
 * deliberate: faces are usually near the middle of a selfie, and a face
 * detector would be far more machinery than this demo can justify.
 */
export async function imageToAvatarDataUrl(file: File, size = 256): Promise<AvatarResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'فایل انتخابی تصویر نیست' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: `حجم تصویر بیش از ${MAX_UPLOAD_MB} مگابایت است` };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, message: 'مرورگر از بازسازی تصویر پشتیبانی نمی‌کند' };
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return { ok: true, dataUrl: canvas.toDataURL('image/jpeg', 0.85) };
  } catch {
    return { ok: false, message: 'تصویر باز نشد؛ فایل دیگری را امتحان کنید' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The Telegram-style photo sheet: gallery or camera, plus remove when a photo
 * is already set. Everything is a plain hidden file input, so no permission
 * machinery is needed — on desktop both rows open the file picker.
 */
export function openPhotoSourceSheet(opts: {
  title: string;
  allowRemove?: boolean;
  onPick: (dataUrl: string, source: 'camera' | 'gallery') => void;
  onRemove?: () => void;
}): void {
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'sr', tabindex: '-1', 'aria-hidden': 'true' }) as HTMLInputElement;
  const cameraInput = h('input', { type: 'file', accept: 'image/*', capture: 'user', class: 'sr', tabindex: '-1', 'aria-hidden': 'true' }) as HTMLInputElement;

  const handle = async (input: HTMLInputElement, source: 'camera' | 'gallery') => {
    const file = input.files?.[0];
    input.value = ''; // lets the same picture be chosen twice in a row
    if (!file) return;
    const result = await imageToAvatarDataUrl(file);
    if (!result.ok || !result.dataUrl) {
      toast(result.message ?? 'تصویر ثبت نشد', 'bad');
      return;
    }
    opts.onPick(result.dataUrl, source);
  };
  fileInput.addEventListener('change', () => void handle(fileInput, 'gallery'));
  cameraInput.addEventListener('change', () => void handle(cameraInput, 'camera'));

  const body = h('div', { class: 'compose-sheet' }, fileInput, cameraInput);
  const row = (glyph: Parameters<typeof icon>[0], label: string, sub: string, go: () => void) => {
    const el = h('button', { class: 'compose-item', type: 'button' });
    el.append(h('span', { class: 'compose-ico' }, icon(glyph)));
    const text = h('span', { class: 'compose-text' });
    text.append(h('span', { class: 'compose-label', text: label }));
    text.append(h('span', { class: 'compose-sub', text: sub }));
    el.append(text);
    el.addEventListener('click', () => {
      close();
      go();
    });
    body.append(el);
  };
  /* Camera first: on a phone taking the picture is the common case, and it is
     the one the thumb reaches for. Picking a file is the fallback. */
  row('camera', 'عکس با دوربین', 'گرفتن عکس تازه', () => cameraInput.click());
  row('image', 'انتخاب فایل', 'برداشتن عکس از دستگاه', () => fileInput.click());
  if (opts.allowRemove && opts.onRemove) {
    row('trash', 'حذف تصویر', 'بازگشت به حروف اول نام', () => opts.onRemove!());
  }

  openSheet({ title: opts.title, body, grabber: true });
}
