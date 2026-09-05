import { describe, expect, it } from 'vitest';
import { centsToInput, inputToCents } from './money-input';

describe('money-input', () => {
  it('formats minor units to a rupees string, dropping a zero fraction', () => {
    expect(centsToInput(240000)).toBe('2400');
    expect(centsToInput(199950)).toBe('1999.50');
  });

  it('parses valid money strings to integer minor units', () => {
    expect(inputToCents('2400')).toBe(240000);
    expect(inputToCents('Rs 1,234.50')).toBe(123450);
    expect(inputToCents('₨7')).toBe(700);
  });

  it('rejects invalid money strings', () => {
    expect(inputToCents('12.999')).toBeNull();
    expect(inputToCents('abc')).toBeNull();
    expect(inputToCents('')).toBeNull();
  });
});
