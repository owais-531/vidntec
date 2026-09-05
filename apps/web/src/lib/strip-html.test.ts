import { describe, expect, it } from 'vitest';
import { stripHtml } from './strip-html';

describe('strip-html', () => {
  it('strips tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
    expect(stripHtml('<ul><li>One</li><li>Two</li></ul>')).toBe('One Two');
  });

  it('trims and returns an empty string for tag-only content', () => {
    expect(stripHtml('<p></p>')).toBe('');
    expect(stripHtml('  <p>  padded  </p>  ')).toBe('padded');
  });

  it('leaves plain text untouched', () => {
    expect(stripHtml('Plain text, no tags.')).toBe('Plain text, no tags.');
  });
});
