import { describe, expect, it } from 'vitest';
import { money, toCsv } from './csv';
import { addDays, formatStoreDateTime, parseStoreDay, startOfStoreDay } from './dates';

describe('toCsv', () => {
  it('writes BOM, CRLF and escapes commas/quotes/newlines', () => {
    const out = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line1\nline2', 5]]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toContain('a,b\r\n');
    expect(out).toContain('"x,y","say ""hi"""');
    expect(out).toContain('"line1\nline2",5');
  });

  it('neutralises formula injection but keeps phone numbers intact', () => {
    const out = toCsv(['v'], [['=HYPERLINK("x")'], ['@SUM(A1)'], ['-2+3'], ['+92 300 1234567'], ['0300-1234567']]);
    expect(out).toContain(`"'=HYPERLINK(""x"")"`);
    expect(out).toContain(`'@SUM(A1)`);
    expect(out).toContain(`'-2+3`);
    expect(out).toContain('+92 300 1234567');
    expect(out).toContain('0300-1234567');
  });

  it('blanks null/undefined and leaves numbers unprefixed (incl. negatives)', () => {
    expect(toCsv(['a', 'b', 'c'], [[null, undefined, -5]])).toContain(',,-5');
  });
});

describe('money', () => {
  it('formats paisa as rupees', () => {
    expect(money(149900)).toBe('1499.00');
    expect(money(0)).toBe('0.00');
  });
});

describe('store-day helpers', () => {
  it('parses a store day to its UTC instant (UTC+5)', () => {
    expect(parseStoreDay('2026-09-29').toISOString()).toBe('2026-09-28T19:00:00.000Z');
  });
  it('startOfStoreDay rolls over at store midnight, not UTC midnight', () => {
    // 2026-09-28T20:00Z is already 01:00 on the 29th in Pakistan
    expect(startOfStoreDay(new Date('2026-09-28T20:00:00Z')).toISOString()).toBe('2026-09-28T19:00:00.000Z');
    expect(startOfStoreDay(new Date('2026-09-28T18:00:00Z')).toISOString()).toBe('2026-09-27T19:00:00.000Z');
  });
  it('formats store time and adds days', () => {
    expect(formatStoreDateTime(new Date('2026-09-28T19:30:00Z'))).toBe('2026-09-29 00:30');
    expect(addDays(new Date('2026-09-28T19:00:00Z'), 1).toISOString()).toBe('2026-09-29T19:00:00.000Z');
  });
});
