'use client';
import * as uiText from '@/content/fa';
import {
  cloneElement,
  isValidElement,
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type ReactElement,
  type InputHTMLAttributes,
  type FormEventHandler,
  type RefAttributes,
  type Ref,
  type ElementType,
} from 'react';
import Link from 'next/link';
import { ReferenceBrand } from '@/components/ui/brand';
import { navigation } from '@/config/navigation';
import { useScrollMemory } from '@/components/navigation/scroll-memory';
import { AppNavigation } from '@/components/navigation/app-navigation';
import './blueprints.css';
import './screen.css';

import { referenceBlueprint } from './registry';
import type { ReferenceControl, ReferenceNode as Node } from './types';
export { referenceBlueprint } from './registry';
export type { ReferenceBlueprint, ReferenceControl } from './types';
export function referenceNodeKey(id: string, className: string) {
  function find(node: Node): string | undefined {
    if (typeof node === 'string') return;
    if (node.attrs.className?.split(/\s+/).includes(className)) return node.key;
    for (const child of node.children) {
      const match = find(child);
      if (match) return match;
    }
  }
  return find(referenceBlueprint(id).tree);
}
export function referenceTextParentKey(id: string, fragment: string) {
  function find(node: Node): string | undefined {
    if (typeof node === 'string') return;
    if (node.children.some((child) => typeof child === 'string' && child.includes(fragment)))
      return node.key;
    for (const child of node.children) {
      const match = find(child);
      if (match) return match;
    }
  }
  return find(referenceBlueprint(id).tree);
}
export type ReferenceBindings = {
  dialogKey?: string;
  heading?: { title?: string; subtitle?: string };
  values?: Record<string, string | boolean>;
  disabled?: ReadonlySet<string>;
  enabled?: ReadonlySet<string>;
  inputProps?: Record<
    string,
    InputHTMLAttributes<HTMLInputElement> & RefAttributes<HTMLInputElement>
  >;
  form?: { onSubmit: FormEventHandler<HTMLFormElement>; submitKeys: ReadonlySet<string> };
  options?: Record<string, string[]>;
  errors?: Record<string, string>;
  replacements?: Record<string, ReactNode>;
  after?: Record<string, ReactNode>;
  text?: (text: string, key: string) => string;
  hidden?: ReadonlySet<string>;
  classes?: Record<string, string>;
  navigation?: Record<string, string>;
  onChange: (control: ReferenceControl, value: string | boolean) => void;
  onAction: (control: ReferenceControl) => void;
};
const propertyNames: Record<string, string> = {
  className: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  tabindex: 'tabIndex',
  for: 'htmlFor',
};
function properties(attrs: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(attrs).map(([key, value]) => [propertyNames[key] ?? key, value]),
  );
}
function controlOptions(control: ReferenceControl) {
  if (control.label.includes(uiText.text_e89b98bf26d3))
    return [
      control.initial,
      uiText.text_06db7e799b6e,
      uiText.text_23d18d9b76c5,
      uiText.text_edd0aba98b4e,
      uiText.text_f709f06f93c6,
    ].filter((v, i, a) => a.indexOf(v) === i);
  if (control.label.includes(uiText.text_5da1817f268d))
    return [control.initial, uiText.text_82a7c2d66b3c, uiText.text_29dbbef63dce];
  if (control.label === uiText.text_1bd8c8b192af)
    return [control.initial, uiText.text_2c5c76628714, uiText.text_e80b72884577];
  return [control.initial];
}
/** Shared native, semantic controls used by connected and preview screens. */
export function ReferenceScreen({
  id,
  bindings,
  preview = false,
  children,
}: {
  id: string;
  bindings: ReferenceBindings;
  preview?: boolean;
  children?: ReactNode;
}) {
  const blueprint = referenceBlueprint(id);
  function findHeader(node: Node): Node | undefined {
    if (typeof node === 'string') return;
    if (node.attrs.className?.split(' ').some((c) => c === 'phone-head' || c === 'desk-head'))
      return node;
    for (const child of node.children) {
      const found = findHeader(child);
      if (found) return found;
    }
  }
  const header = findHeader(blueprint.tree);
  const titleNode =
    header && typeof header !== 'string'
      ? header.children
          .flatMap((n) =>
            typeof n === 'string'
              ? []
              : [n, ...n.children.filter((c): c is Exclude<Node, string> => typeof c !== 'string')],
          )
          .find((n) => n.tag === 'h2')
      : undefined;
  const subNode =
    header && typeof header !== 'string'
      ? header.children
          .flatMap((n) =>
            typeof n === 'string'
              ? []
              : [n, ...n.children.filter((c): c is Exclude<Node, string> => typeof c !== 'string')],
          )
          .find((n) => n.attrs.className === 'sub' || n.tag === 'p')
      : undefined;
  const scroll = useRef<HTMLElement | null>(null);
  useScrollMemory(scroll, id);
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>(`[data-mk-view="${id}"] [role="dialog"]`);
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),a[href],select,textarea,[tabindex="0"]',
      ),
    ];
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      const items = focusable();
      if (event.key === 'Escape') {
        const close = blueprint.controls.find((c) =>
          [uiText.text_313cbecb4dd3, uiText.text_fa7af603d430, uiText.text_19aa3b256f52].includes(
            c.label,
          ),
        );
        if (close) bindings.onAction(close);
      }
      if (event.key === 'Tab' && items.length) {
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    dialog.addEventListener('keydown', keydown);
    return () => {
      dialog.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [id, bindings.dialogKey]);
  function render(node: Node, parent = ''): ReactNode {
    if (typeof node === 'string')
      return parent === titleNode?.key && bindings.heading?.title !== undefined
        ? bindings.heading.title
        : parent === subNode?.key && bindings.heading?.subtitle !== undefined
          ? bindings.heading.subtitle
          : (bindings.text?.(node, parent) ?? node);
    if (bindings.hidden?.has(node.key)) return null;
    if (bindings.replacements && Object.hasOwn(bindings.replacements, node.key)) {
      const replacement = bindings.replacements[node.key];
      return node.attrs.className?.split(/\s+/).includes('app-body') && isValidElement(replacement)
        ? cloneElement(replacement as ReactElement<{ ref?: Ref<HTMLElement>; role?: string }>, {
            ref: scroll,
            role: 'main',
          })
        : replacement;
    }
    if (node.attrs.className === 'tabbar') {
      const selected = node.children.find(
        (child) =>
          typeof child !== 'string' && child.attrs.className?.split(' ').includes('active'),
      );
      const label = typeof selected === 'object' ? selected.control?.label : undefined;
      return (
        <AppNavigation
          key={node.key}
          preview={preview}
          activeHref={navigation.find((item) => item.name === label)?.href}
        />
      );
    }
    const attrs = properties(node.attrs),
      control = node.control;
    let tag: ElementType = node.tag as ElementType;
    let content: ReactNode = node.children.map((child, index) => (
      <RenderChild
        key={typeof child === 'string' ? 'text-' + index : child.key}
        value={render(child, node.key)}
      />
    ));
    const props: Record<string, unknown> = {
      ...attrs,
      key: node.key,
      style: node.style as CSSProperties,
    };
    if (node.attrs.className === 'banner-title') {
      props.role = 'heading';
      props['aria-level'] = 1;
    }
    if (id === 'MK-01' && node.tag === 'header') props['aria-hidden'] = true;
    if (bindings.navigation?.[node.key])
      props['data-navigation-target'] = bindings.navigation[node.key];
    if (bindings.classes?.[node.key] !== undefined) props.className = bindings.classes[node.key];
    if (node.attrs.className?.split(/\s+/).some((c) => c === 'app-body' || c === 'chat-bg')) {
      props.ref = scroll;
      tag = 'main';
    }
    if (node.attrs.className?.split(/\s+/).includes('sheet-modal')) {
      const title = node.children.find((child) => typeof child !== 'string' && child.tag === 'h3');
      const label =
        title && typeof title !== 'string'
          ? title.children.filter((c) => typeof c === 'string').join('')
          : uiText.text_a2877af27f5c;
      Object.assign(props, {
        role: 'dialog',
        'aria-modal': true,
        'aria-label': bindings.text?.(label, node.key) ?? label,
      });
    }
    if (node.attrs.className === 'brand') content = <ReferenceBrand />;
    if (node.key === '0') {
      if (bindings.form) {
        tag = 'form';
        props.onSubmit = bindings.form.onSubmit;
        props.noValidate = true;
      }
      props.className = 'mk-ui ' + (attrs.className ?? '');
      props['data-mk-view'] = id;
      props['aria-label'] = blueprint.title;
    }
    if (
      node.attrs.className?.split(' ').includes('checkline') &&
      node.children.some(
        (child) =>
          typeof child !== 'string' && ['check', 'radio'].includes(child.control?.kind ?? ''),
      )
    )
      tag = 'label';
    if (control) {
      const accessibleLabel = bindings.text?.(control.label, control.key) ?? control.label;
      const value =
        bindings.values?.[control.key] ??
        (['check', 'checkCircle', 'radio', 'toggle'].includes(control.kind)
          ? control.checked
          : control.placeholder
            ? ''
            : control.initial);
      const disabled =
        (control.disabled && !bindings.enabled?.has(control.key)) ||
        bindings.disabled?.has(control.key) ||
        false;
      if (control.disabled && !disabled)
        props.className = String(props.className ?? '').replace(/\bdisabled\b/g, '');
      props['data-reference-control'] = control.key;
      if (control.kind === 'otp') {
        const digits = String(value)
          .replace(/[^0-9۰-۹]/g, '')
          .slice(0, 6);
        content = (
          <>
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className={index === digits.length ? 'focus' : ''}>
                {digits[index]?.replace(/[0-9]/g, (d) => Number(d).toLocaleString('fa-IR')) ?? ''}
              </span>
            ))}
            <input
              value={digits}
              aria-label={uiText.auth_codeLabel}
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              disabled={disabled}
              onChange={(event) => bindings.onChange(control, event.target.value)}
              {...bindings.inputProps?.[control.key]}
            />
          </>
        );
      } else if (['field', 'search', 'compose', 'assistantCompose'].includes(control.kind)) {
        const inputProps = {
          id: `field-${id}-${control.key}`,
          'aria-label': control.label,
          disabled,
          value: String(value),
          'aria-invalid': !!bindings.errors?.[control.key],
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
          ) => bindings.onChange(control, event.target.value),
        };
        if (
          control.kind === 'search' ||
          control.kind === 'compose' ||
          control.kind === 'assistantCompose'
        ) {
          tag = 'div';
          const icons = node.children.filter(
            (child) => typeof child !== 'string' && child.tag === 'svg',
          );
          const input = (
            <input
              {...inputProps}
              type={control.kind === 'search' ? 'search' : 'text'}
              placeholder={control.initial}
              value={bindings.values?.[control.key] === undefined ? '' : String(value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && control.kind === 'assistantCompose') {
                  event.preventDefault();
                  bindings.onAction({ ...control, label: uiText.text_51dd685556b8 });
                }
              }}
            />
          );
          content =
            control.kind === 'assistantCompose' ? (
              <>
                {input}
                <button
                  type="button"
                  className="mk-compose-send"
                  aria-label={uiText.text_51dd685556b8}
                  onClick={() => bindings.onAction({ ...control, label: uiText.text_51dd685556b8 })}
                >
                  {icons.map((child) => render(child))}
                </button>
              </>
            ) : (
              <>
                {icons.map((child) => render(child))}
                {input}
              </>
            );
        } else if (control.select) {
          tag = 'div';
          content = (
            <>
              <select {...inputProps}>
                {(bindings.options?.[control.key] ?? controlOptions(control)).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {node.children
                .filter((child) => typeof child !== 'string' && child.tag === 'svg')
                .map((child) => render(child))}
            </>
          );
        } else if (control.icon) {
          tag = 'div';
          content = (
            <>
              <input
                {...inputProps}
                placeholder={control.initial}
                value={
                  bindings.values?.[control.key] === undefined && control.placeholder
                    ? ''
                    : String(value)
                }
              />
              {node.children
                .filter((child) => typeof child !== 'string' && child.tag === 'svg')
                .map((child) => render(child))}
            </>
          );
        } else {
          tag = control.multiline ? 'textarea' : 'input';
          Object.assign(
            props,
            inputProps,
            {
              placeholder: control.initial,
              autoFocus: control.classes.includes('focused'),
              dir: node.children.some((c) => typeof c !== 'string' && c.attrs.className === 'latin')
                ? 'ltr'
                : undefined,
              type: control.multiline ? undefined : 'text',
            },
            bindings.inputProps?.[control.key],
          );
          content = undefined;
        }
      } else if (['check', 'radio'].includes(control.kind)) {
        tag = 'input';
        content = undefined;
        props.className = String(props.className ?? '').replace(/\b(checked|selected)\b/g, '');
        Object.assign(props, {
          type: control.kind === 'check' ? 'checkbox' : 'radio',
          name: control.kind === 'radio' ? `choice-${id}` : undefined,
          'aria-label': accessibleLabel,
          checked: !!value,
          disabled,
          onChange: () => bindings.onChange(control, !value),
        });
      } else if (control.kind === 'checkCircle') {
        tag = 'button';
        if (!value) content = null;
        Object.assign(props, {
          type: 'button',
          disabled,
          role: 'checkbox',
          'aria-checked': !!value,
          'aria-label': accessibleLabel,
          onClick: () => bindings.onChange(control, !value),
          className: 'check-circle' + (value ? ' on' : ''),
        });
      } else if (control.kind === 'quizOption') {
        tag = 'label';
      } else if (control.kind === 'navigation') {
        const entry = navigation.find((item) => item.name === control.label);
        const previewNavigation: Record<string, string> = {
          آموزشگاه: 'MK-04',
          فوق‌برنامه: 'MK-11',
          دستیار: 'MK-38',
          پیام‌ها: 'MK-35',
          پروفایل: 'MK-47',
        };
        if (entry) {
          tag = Link;
          props.href = preview
            ? '/preview/reference/' + previewNavigation[control.label]
            : entry.href;
          props['aria-label'] = control.label;
          props['aria-current'] = node.attrs.className?.split(' ').includes('active')
            ? 'page'
            : undefined;
        }
      } else if (control.kind === 'message') {
        Object.assign(props, {
          tabIndex: 0,
          'aria-label': uiText.text_b3686a576a60,
          onContextMenu: (event: React.MouseEvent) => {
            event.preventDefault();
            bindings.onAction(control);
          },
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault();
              bindings.onAction(control);
            }
          },
        });
      } else if (control.kind === 'upload') {
        tag = 'label';
        content = (
          <>
            {content}
            <input
              type="file"
              aria-label={uiText.text_eef3e6a8a691}
              onChange={(event) => bindings.onChange(control, event.target.files?.[0]?.name ?? '')}
            />
          </>
        );
      } else {
        tag = 'button';
        Object.assign(props, {
          type: 'button',
          disabled,
          'aria-label': accessibleLabel,
          onClick: () => bindings.onAction(control),
        });
        if (bindings.form?.submitKeys.has(control.key)) {
          props.type = 'submit';
          delete props.onClick;
        }
        if (control.kind === 'toggle')
          Object.assign(props, {
            role: 'switch',
            'aria-checked': !!value,
            onClick: () => bindings.onChange(control, !value),
            className: (attrs.className ?? '').replace(/\bon\b/g, '') + (value ? ' on' : ''),
          });
      }
      if (bindings.errors?.[control.key]) props['aria-describedby'] = `error-${id}-${control.key}`;
    }
    if (
      typeof tag === 'string' &&
      [
        'br',
        'hr',
        'input',
        'img',
        'area',
        'base',
        'col',
        'embed',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr',
      ].includes(tag)
    )
      content = undefined;
    if (bindings.after?.[node.key])
      content = (
        <>
          {content}
          {bindings.after[node.key]}
        </>
      );
    const element = createElement(tag, props, content);
    return bindings.errors?.[node.key] ? (
      <>
        {element}
        <p className="err" id={`error-${id}-${node.key}`} role="alert">
          {bindings.errors[node.key]}
        </p>
      </>
    ) : (
      element
    );
  }
  return (
    <>
      {preview && (
        <span className="mk-preview-label" role="status">
          {uiText.text_3a711b658e49}
        </span>
      )}
      {render(blueprint.tree)}
      {children}
    </>
  );
}
function RenderChild({ value }: { value: ReactNode }) {
  return value;
}
