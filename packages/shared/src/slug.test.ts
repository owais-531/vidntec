import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('kebab-cases titles', () => {
    expect(slugify('Hexagonal Desk Organizer')).toBe('hexagonal-desk-organizer');
    expect(slugify('  Low-Poly  Planter!! ')).toBe('low-poly-planter');
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('never leaves edge dashes', () => {
    expect(slugify('***')).toBe('');
    expect(slugify('-abc-')).toBe('abc');
  });
});
