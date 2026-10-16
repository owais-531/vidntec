import { describe, expect, it } from 'vitest';
import type { PersonalizationField } from '@vidntec/shared';
import { emptyDraft, fieldsSignature, fromDrafts, toDrafts } from './personalization-draft';

const stored: PersonalizationField[] = [
  { id: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Enter name', maxLength: 20 },
  {
    id: 'colour',
    type: 'dropdown',
    label: 'Colour',
    required: false,
    choices: [{ label: 'Red', hex: '#ff0000' }, { label: 'Matte' }],
  },
  { id: 'wrap', type: 'checkbox', label: 'Gift wrap', required: false },
];

describe('personalization drafts', () => {
  it('round-trips stored fields unchanged', () => {
    const r = fromDrafts(toDrafts(stored));
    expect(r).toEqual({ ok: true, fields: stored });
  });

  it('unchanged fields have an identical signature (no false "unsaved changes")', () => {
    expect(fieldsSignature(toDrafts(stored))).toBe(fieldsSignature(toDrafts(stored)));
  });

  it('drops blank choices but errors when none are left', () => {
    const d = emptyDraft('dropdown');
    d.label = 'Size';
    expect(fromDrafts([d])).toMatchObject({ ok: false });
    d.choices = [{ label: 'S', hex: '' }, { label: '  ', hex: '' }];
    expect(fromDrafts([d])).toMatchObject({ ok: true });
  });

  it('requires a name and a sane max length', () => {
    const t = emptyDraft('text');
    expect(fromDrafts([t])).toMatchObject({ ok: false });
    t.label = 'Name';
    t.maxLength = '0';
    expect(fromDrafts([t])).toMatchObject({ ok: false });
    t.maxLength = '12';
    expect(fromDrafts([t])).toMatchObject({ ok: true });
  });

  it('reports duplicate names', () => {
    const a = emptyDraft('checkbox');
    const b = emptyDraft('checkbox');
    a.label = 'Gift';
    b.label = 'gift';
    expect(fromDrafts([a, b])).toMatchObject({ ok: false });
  });

  it('no fields is valid (personalization is optional)', () => {
    expect(fromDrafts([])).toEqual({ ok: true, fields: [] });
  });
});
