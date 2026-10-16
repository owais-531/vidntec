import { describe, expect, it } from 'vitest';
import {
  createProductSchema,
  personalizationFieldsSchema,
  personalizationKey,
  previewMappingProblem,
  resolvePersonalization,
  type PersonalizationField,
} from './index';

const fields: PersonalizationField[] = [
  { id: 'name', type: 'text', label: 'Name', required: true, placeholder: '', maxLength: 10 },
  { id: 'initial', type: 'text', label: 'Initial Letter', required: false, placeholder: '', maxLength: 1 },
  {
    id: 'colour',
    type: 'dropdown',
    label: 'Main Colour',
    required: true,
    choices: [{ label: 'Red', hex: '#ff0000' }, { label: 'Matte' }],
  },
  { id: 'wrap', type: 'checkbox', label: 'Gift wrap', required: false },
  { id: 'check', type: 'checkbox', label: 'Spelling checked', required: true },
];

const ok = { name: 'Ali', colour: 'Red', check: 'true' };

describe('resolvePersonalization', () => {
  it('resolves valid answers, drops empty optional fields, takes hex from the choice', () => {
    const { selections, errors } = resolvePersonalization(fields, { ...ok, initial: '  ' });
    expect(errors).toEqual({});
    expect(selections).toEqual([
      { fieldId: 'name', label: 'Name', type: 'text', value: 'Ali' },
      { fieldId: 'colour', label: 'Main Colour', type: 'dropdown', value: 'Red', hex: '#ff0000' },
      { fieldId: 'check', label: 'Spelling checked', type: 'checkbox', value: 'Yes' },
    ]);
  });

  it('flags missing required text/dropdown/checkbox', () => {
    const { errors } = resolvePersonalization(fields, {});
    expect(Object.keys(errors).sort()).toEqual(['check', 'colour', 'name']);
  });

  it('rejects too-long text and unknown dropdown choices', () => {
    const { errors } = resolvePersonalization(fields, {
      ...ok,
      name: 'x'.repeat(11),
      colour: 'Hacked',
    });
    expect(Object.keys(errors).sort()).toEqual(['colour', 'name']);
  });

  it('ignores unknown ids and keeps an unticked optional checkbox out', () => {
    const { selections, errors } = resolvePersonalization(fields, { ...ok, bogus: 'x', wrap: 'false' });
    expect(errors).toEqual({});
    expect(selections.map((s) => s.fieldId)).toEqual(['name', 'colour', 'check']);
  });

  it('an optional checkbox ticked is stored as Yes', () => {
    const { selections } = resolvePersonalization(fields, { ...ok, wrap: 'true' });
    expect(selections.find((s) => s.fieldId === 'wrap')?.value).toBe('Yes');
  });

  it('no fields = nothing to resolve', () => {
    expect(resolvePersonalization([], { anything: 'x' })).toEqual({ selections: [], errors: {} });
  });
});

describe('personalizationKey', () => {
  it('is stable per answers and differs when an answer differs', () => {
    const a = resolvePersonalization(fields, ok).selections;
    const b = resolvePersonalization(fields, { ...ok, name: 'Sara' }).selections;
    expect(personalizationKey(a)).toBe(personalizationKey(resolvePersonalization(fields, ok).selections));
    expect(personalizationKey(a)).not.toBe(personalizationKey(b));
    expect(personalizationKey([])).toBe('[]');
  });
});

describe('personalizationFieldsSchema', () => {
  it('accepts the screenshot example', () => {
    expect(personalizationFieldsSchema.safeParse(fields).success).toBe(true);
  });

  it('applies text defaults', () => {
    const r = personalizationFieldsSchema.parse([{ id: 'n', type: 'text', label: 'Name' }]);
    expect(r[0]).toMatchObject({ required: false, maxLength: 40, placeholder: '' });
  });

  it('caps at 8 fields', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `f${i}`, type: 'checkbox', label: `F${i}` }));
    expect(personalizationFieldsSchema.safeParse(nine.slice(0, 8)).success).toBe(true);
    expect(personalizationFieldsSchema.safeParse(nine).success).toBe(false);
  });

  it('rejects duplicate labels / ids, empty dropdowns, duplicate choices', () => {
    const dupe = [
      { id: 'a', type: 'checkbox', label: 'Same' },
      { id: 'b', type: 'checkbox', label: 'same' },
    ];
    expect(personalizationFieldsSchema.safeParse(dupe).success).toBe(false);
    expect(personalizationFieldsSchema.safeParse([{ id: 'a', type: 'dropdown', label: 'X', choices: [] }]).success).toBe(false);
    expect(
      personalizationFieldsSchema.safeParse([
        { id: 'a', type: 'dropdown', label: 'X', choices: [{ label: 'A' }, { label: 'a' }] },
      ]).success,
    ).toBe(false);
  });
});

describe('previewMappingProblem', () => {
  const fs = [
    { id: 'n', type: 'text', label: 'Name' },
    { id: 'i', type: 'text', label: 'Initial' },
    { id: 'c', type: 'dropdown', label: 'Colour' },
    { id: 'w', type: 'checkbox', label: 'Wrap' },
  ];
  it('accepts a full valid mapping and an off preview with nothing mapped', () => {
    expect(
      previewMappingProblem(fs, { enabled: true, nameFieldId: 'n', initialFieldId: 'i', colourFieldId: 'c' }),
    ).toBeNull();
    expect(previewMappingProblem(fs, { enabled: false })).toBeNull();
  });
  it('rejects wrong types, missing name, and fields that no longer exist', () => {
    expect(previewMappingProblem(fs, { enabled: true, nameFieldId: 'c' })).toMatch(/name/);
    expect(previewMappingProblem(fs, { enabled: true })).toMatch(/name/);
    expect(previewMappingProblem(fs, { enabled: true, nameFieldId: 'n', initialFieldId: 'w' })).toMatch(/initial/);
    expect(previewMappingProblem(fs, { enabled: true, nameFieldId: 'n', colourFieldId: 'i' })).toMatch(/colour/);
    expect(previewMappingProblem(fs, { enabled: false, nameFieldId: 'gone' })).toMatch(/no longer exists/);
  });
});

describe('createProductSchema preview rule', () => {
  const base = {
    title: 'T',
    variants: [{ name: 'V', price: 100, sku: 'S', stock: 1 }],
    previewEnabled: true,
  };
  const nameField = { id: 'n', type: 'text', label: 'Name' };
  it('needs a mapped text field to enable the preview', () => {
    expect(createProductSchema.safeParse({ ...base, personalizationFields: [] }).success).toBe(false);
    // a text field exists but isn't picked as the name
    expect(createProductSchema.safeParse({ ...base, personalizationFields: [nameField] }).success).toBe(false);
    expect(
      createProductSchema.safeParse({ ...base, previewNameFieldId: 'n', personalizationFields: [nameField] }).success,
    ).toBe(true);
  });
});
