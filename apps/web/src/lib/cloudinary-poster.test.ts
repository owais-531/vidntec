import { describe, expect, it } from 'vitest';
import { posterUrl } from './cloudinary-poster';

describe('posterUrl', () => {
  it('rewrites a Cloudinary video URL to a first-frame jpg', () => {
    expect(
      posterUrl('https://res.cloudinary.com/demo/video/upload/v1712/vidntec/products/clip.mp4'),
    ).toBe('https://res.cloudinary.com/demo/video/upload/so_0/v1712/vidntec/products/clip.jpg');
  });

  it('keeps a trailing query string', () => {
    expect(posterUrl('https://res.cloudinary.com/demo/video/upload/v1/clip.webm?x=1')).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0/v1/clip.jpg?x=1',
    );
  });

  it('returns non-video URLs unchanged', () => {
    const img = 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg';
    expect(posterUrl(img)).toBe(img);
  });
});
