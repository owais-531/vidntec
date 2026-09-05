import { describe, expect, it } from 'vitest';
import { sanitizeDescription } from './sanitize-description';

describe('sanitizeDescription', () => {
  it('keeps the allowed formatting tags', () => {
    expect(sanitizeDescription('<p>Hello <strong>world</strong>, <em>nice</em>.</p>')).toBe(
      '<p>Hello <strong>world</strong>, <em>nice</em>.</p>',
    );
    expect(sanitizeDescription('<ul><li>One</li><li>Two</li></ul>')).toBe(
      '<ul><li>One</li><li>Two</li></ul>',
    );
  });

  it('strips scripts and event-handler payloads, keeping allowed tags', () => {
    const result = sanitizeDescription(
      '<script>alert(1)</script><img src=x onerror=alert(1)><strong>ok</strong>',
    );
    expect(result).toBe('<strong>ok</strong>');
  });

  it('strips attributes from allowed tags', () => {
    expect(sanitizeDescription('<p onclick="alert(1)" style="color:red">hi</p>')).toBe('<p>hi</p>');
  });

  it('strips disallowed tags like headings and links', () => {
    expect(sanitizeDescription('<h1>Title</h1><a href="https://evil.example">link</a>')).toBe(
      'Titlelink',
    );
  });

  it('collapses a Tiptap-empty doc and other tags-only content to an empty string', () => {
    expect(sanitizeDescription('<p></p>')).toBe('');
    expect(sanitizeDescription('<p>   </p>')).toBe('');
    expect(sanitizeDescription('')).toBe('');
  });
});
