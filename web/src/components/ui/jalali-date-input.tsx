'use client';
import { latinDigits } from '@/lib/formatting';
import {
  dateRangeError,
  jalaliInputValue,
  parseJalaliInput,
  toJalaliDate,
} from '@/lib/jalali-date';
import { jalaliPickerState } from '@/lib/jalali-picker-state';
import { CalendarDays, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
type Picker = {
  startWatch: (options: Record<string, unknown>) => void;
  updateOptions: (options: Record<string, unknown>) => void;
  show: (input: HTMLInputElement) => void;
  hide: () => void;
};
declare global {
  interface Window {
    jalaliDatepicker?: Picker;
  }
}
let loading: Promise<Picker> | undefined;
function loadPicker() {
  return (loading ??= (async () => {
    await import('@majidh1/jalalidatepicker');
    const picker = window.jalaliDatepicker;
    if (!picker) throw new Error('Calendar failed to load');
    picker.startWatch({ autoShow: false, autoHide: false, autoReadOnlyInput: false });
    return picker;
  })().catch((error) => {
    loading = undefined;
    throw error;
  }));
}
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  withTime?: boolean;
};
export function JalaliDateInput({
  value,
  defaultValue = '',
  onValueChange,
  min,
  max,
  withTime = false,
  name,
  id,
  disabled,
  required,
  'aria-describedby': describedBy,
  ...rest
}: Props) {
  const generated = useId(),
    inputId = id ?? 'jalali-' + generated;
  const initial = value ?? defaultValue;
  const [canonical, setCanonical] = useState(initial),
    [text, setText] = useState(() => jalaliInputValue(initial, withTime)),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false),
    [loadingError, setLoadingError] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    host = useRef<HTMLDivElement>(null),
    root = useRef<HTMLDivElement>(null);
  const emitted = useRef(initial),
    currentChange = useRef<(text: string, fromPicker?: boolean) => void>(() => {});
  const errorId = inputId + '-error',
    hostId = inputId + '-calendar';
  useEffect(() => {
    if (value !== undefined && value !== emitted.current) {
      emitted.current = value;
      setCanonical(value);
      setText(jalaliInputValue(value, withTime));
      setError('');
      input.current?.setCustomValidity('');
    }
  }, [value, withTime]);
  useEffect(() => {
    const parsed = parseJalaliInput(text, withTime);
    const message =
      parsed === null
        ? withTime
          ? 'تاریخ و ساعت شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۸/۰۷ ۱۴:۳۰.'
          : 'تاریخ شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۸/۰۷.'
        : dateRangeError(parsed, min, max);
    setError(message);
    input.current?.setCustomValidity(message);
  }, [min, max, text, withTime]);
  function close() {
    if (jalaliPickerState.current?.input === input.current) {
      window.jalaliDatepicker?.hide();
      jalaliPickerState.current = undefined;
    }
    setOpen(false);
  }
  currentChange.current = (next, fromPicker = false) => {
    // The vendor's v1 parser reads ASCII digits, even when its controls render Persian digits.
    // Normalize accepted Persian/Arabic input before it is read again by the picker.
    const normalized = latinDigits(next);
    if (input.current && input.current.value !== normalized) input.current.value = normalized;
    setText(normalized);
    setLoadingError(false);
    const parsed = parseJalaliInput(normalized, withTime);
    const message =
      parsed === null
        ? withTime
          ? 'تاریخ و ساعت شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۸/۰۷ ۱۴:۳۰.'
          : 'تاریخ شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۸/۰۷.'
        : dateRangeError(parsed, min, max);
    setError(message);
    input.current?.setCustomValidity(message);
    const nextCanonical = message ? '' : parsed!;
    setCanonical(nextCanonical);
    if (emitted.current !== nextCanonical) {
      emitted.current = nextCanonical;
      onValueChange?.(nextCanonical);
    }
    if (fromPicker && !withTime) {
      close();
      input.current?.focus();
    }
  };
  useEffect(() => {
    const element = input.current!;
    const change = () => currentChange.current(element.value, true);
    element.addEventListener('jdp:change', change);
    const outside = (e: PointerEvent) => {
      if (jalaliPickerState.current?.input === element && !root.current?.contains(e.target as Node))
        close();
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      element.removeEventListener('jdp:change', change);
      document.removeEventListener('pointerdown', outside);
      if (jalaliPickerState.current?.input === element) {
        window.jalaliDatepicker?.hide();
        jalaliPickerState.current = undefined;
      }
    };
  }, []);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  function decorate() {
    const container = host.current?.querySelector('jdp-container');
    if (!container) return;
    container.setAttribute('role', 'group');
    container.setAttribute(
      'aria-label',
      withTime ? 'انتخاب تاریخ و ساعت شمسی' : 'انتخاب تاریخ شمسی',
    );
    container
      .querySelectorAll<HTMLElement>(
        '.jdp-day,.jdp-icon-plus,.jdp-icon-minus,.jdp-btn-today,.jdp-btn-empty,.jdp-btn-close',
      )
      .forEach((element) => {
        const unavailable =
          element.classList.contains('disabled-day') ||
          element.classList.contains('disabled-btn') ||
          element.classList.contains('not-in-range');
        element.setAttribute('role', 'button');
        element.tabIndex = unavailable ? -1 : 0;
        element.setAttribute('aria-disabled', String(unavailable));
        if (element.classList.contains('jdp-day')) {
          element.setAttribute('aria-label', 'انتخاب روز ' + element.textContent);
          element.setAttribute('aria-pressed', String(element.classList.contains('selected')));
        } else if (
          element.classList.contains('jdp-icon-plus') ||
          element.classList.contains('jdp-icon-minus')
        )
          element.setAttribute(
            'aria-label',
            (element.closest('.jdp-years') ? 'سال' : 'ماه') +
              (element.classList.contains('jdp-icon-plus') ? ' بعد' : ' قبل'),
          );
      });
    container.querySelectorAll<HTMLSelectElement>('select').forEach((element, index) => {
      element.tabIndex = 0;
      element.setAttribute(
        'aria-label',
        element.closest('.jdp-year')
          ? 'سال شمسی'
          : element.closest('.jdp-month')
            ? 'ماه شمسی'
            : element.closest('.jdp-time-container')
              ? index === 2
                ? 'دقیقه'
                : 'ساعت'
              : 'زمان',
      );
    });
  }
  useEffect(() => {
    const element = host.current!;
    const observer = new MutationObserver(decorate);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [withTime]);
  async function show() {
    if (disabled) return;
    try {
      const picker = await loadPicker();
      if (!input.current?.isConnected || !host.current?.isConnected || input.current.disabled)
        return;
      jalaliPickerState.current?.close();
      for (const tag of ['jdp-container', 'jdp-overlay']) {
        const node = document.querySelector(tag);
        if (node) host.current.append(node);
      }
      picker.updateOptions({
        container: host.current,
        autoShow: false,
        autoHide: false,
        autoReadOnlyInput: false,
        date: true,
        time: withTime,
        hasSecond: false,
        persianDigits: true,
        minDate: 'attr',
        maxDate: 'attr',
        hideAfterChange: false,
        showCloseBtn: true,
        showEmptyBtn: true,
        position: 'right',
      });
      jalaliPickerState.current = { input: input.current, close };
      picker.show(input.current);
      setOpen(true);
      setLoadingError(false);
      decorate();
    } catch {
      setLoadingError(true);
    }
  }
  return (
    <div
      ref={root}
      className="makan-date-field"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          input.current?.focus();
          return;
        }
        const target = event.target as HTMLElement;
        if (
          target.getAttribute('role') === 'button' &&
          target.tagName !== 'BUTTON' &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          if (target.getAttribute('aria-disabled') !== 'true') target.click();
        }
        if (
          target.classList.contains('jdp-day') &&
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
        ) {
          event.preventDefault();
          const days = Array.from(
            host.current!.querySelectorAll<HTMLElement>('.jdp-day[aria-disabled="false"]'),
          );
          const index = days.indexOf(target);
          days[
            index + ({ ArrowLeft: 1, ArrowRight: -1, ArrowUp: -7, ArrowDown: 7 }[event.key] ?? 0)
          ]?.focus();
        }
      }}
    >
      <div className="makan-date-control">
        <input
          {...rest}
          ref={input}
          id={inputId}
          type="text"
          dir="ltr"
          data-jdp=""
          data-jdp-min-date={min ? toJalaliDate(min.slice(0, 10)) : undefined}
          data-jdp-max-date={max ? toJalaliDate(max.slice(0, 10)) : undefined}
          value={text}
          required={required}
          disabled={disabled}
          autoComplete="off"
          placeholder={withTime ? '۱۴۰۵/۰۸/۰۷ ۱۴:۳۰' : '۱۴۰۵/۰۸/۰۷'}
          aria-invalid={!!error || rest['aria-invalid']}
          aria-describedby={
            [describedBy, error ? errorId : ''].filter(Boolean).join(' ') || undefined
          }
          onChange={(event) => currentChange.current(event.target.value)}
          onClick={() => {
            if (!open) void show();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !open) {
              event.preventDefault();
              void show();
            }
          }}
        />
        <button
          type="button"
          className="makan-date-trigger"
          disabled={disabled}
          aria-label={open ? 'بستن تقویم شمسی' : 'باز کردن تقویم شمسی'}
          aria-expanded={open}
          aria-controls={hostId}
          onClick={() => {
            if (open) close();
            else void show();
          }}
        >
          {open ? <X size={19} /> : <CalendarDays size={19} />}
        </button>
      </div>
      {name && <input type="hidden" name={name} value={canonical} disabled={disabled} />}
      <div
        id={hostId}
        ref={host}
        hidden={!open}
        className="makan-jdp-host"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('.jdp-btn-close')) {
            close();
            input.current?.focus();
          }
        }}
      />
      {error && (
        <small id={errorId} className="makan-date-error" role="status">
          {error}
        </small>
      )}
      {loadingError && (
        <small role="status" className="makan-date-error">
          تقویم باز نشد؛ تاریخ شمسی را در کادر وارد کنید یا دوباره دکمهٔ تقویم را بزنید.
        </small>
      )}
    </div>
  );
}
