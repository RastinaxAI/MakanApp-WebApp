/**
 * Search folding: the chat search compares user input against conversation
 * text, and Persian makes that comparison subtle — ZWNJ is invisible, Arabic
 * and Persian letters share a keyboard, and Persian digits stand in for
 * Latin ones. These lock the behaviour down so a query typed the "easy" way
 * still finds the message.
 */

import { describe, expect, it } from 'vitest';

import { foldForSearch, searchHit } from '../src/core/format';

describe('foldForSearch', () => {
  it('drops the zero-width non-joiner so a typed space matches', () => {
    // «اطلاعیه‌های» is one word; the ZWNJ renders as nothing.
    expect(foldForSearch('اطلاعیه‌های')).toBe('اطلاعیههای');
    expect(foldForSearch('اطلاعیه های')).toBe(foldForSearch('اطلاعیه‌های'));
  });

  it('keeps alef-madda, which is its own letter in Persian', () => {
    // آموزش (teach) must not fold to اموزش.
    expect(foldForSearch('آموزشگاه')).toContain('آموزشگاه');
    expect(foldForSearch('آموزشگاه')).not.toContain('اموزش');
  });

  it('folds Arabic and Urdu look-alikes onto the Persian letters', () => {
    expect(foldForSearch('كتاب')).toBe('کتاب');
    expect(foldForSearch('علي')).toBe('علی');
    expect(foldForSearch('مُدَرِّس')).toBe('مدرس');
  });

  it('folds Persian and Arabic digits to Latin ones', () => {
    expect(foldForSearch('۱۲۳')).toBe('123');
    expect(foldForSearch('٤٥٦')).toBe('456');
  });

  it('strips harakat and tashdid', () => {
    expect(foldForSearch('کِتاب')).toBe('کتاب');
    expect(foldForSearch('مُدَرِّس')).toBe('مدرس');
  });

  it('joins words that were separated only by an invisible joiner', () => {
    expect(foldForSearch('ریشه های معادله')).toBe('ریشههایمعادله');
  });

  it('ignores case for latin runs', () => {
    expect(foldForSearch('Viète')).toBe(foldForSearch('VIÈTE'));
  });
});

describe('searchHit', () => {
  const thread = 'ثبت‌نام ترم بهار آغاز می‌شود — سایت آموزشگاه';

  it('matches a two-word phrase typed without the invisible joiner', () => {
    expect(searchHit(thread, 'ثبت نام')).toBe(true);
    expect(searchHit(thread, 'ثبت‌نام')).toBe(true);
  });

  it('finds a sender name inside a message body', () => {
    expect(searchHit('آرش: بله، چون مهلت با اجازه تمدید شد.', 'آرش')).toBe(true);
  });

  it('matches regardless of which alef form was typed', () => {
    expect(searchHit('کتابخانه آموزشگاه', 'library'.length ? 'کتابخانه' : '')).toBe(true);
  });

  it('returns true for an empty query so a blank box never filters', () => {
    expect(searchHit(thread, '')).toBe(true);
    expect(searchHit(thread, '   ')).toBe(true);
  });

  it('does not match an unrelated word', () => {
    expect(searchHit(thread, 'هوش مصنوعی')).toBe(false);
  });
});
