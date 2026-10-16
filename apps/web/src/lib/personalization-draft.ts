import {
  PERSONALIZATION_TEXT_DEFAULT_MAX,
  personalizationFieldsSchema,
  type PersonalizationField,
  type PersonalizationFieldType,
} from '@vidntec/shared';

/**
 * Editable form state for one personalization field. Text-box values stay
 * strings (so half-typed numbers don't fight the input) and are converted to
 * the validated `PersonalizationField` shape by `fromDrafts` on save.
 */
export interface FieldDraft {
  /** Stable id — kept for existing fields so carts/orders keep matching. */
  id: string;
  type: PersonalizationFieldType;
  label: string;
  required: boolean;
  placeholder: string;
  maxLength: string;
  /** `hex` '' = no colour swatch for that choice. */
  choices: Array<{ label: string; hex: string }>;
}

export function newFieldId(): string {
  return `f${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDraft(type: PersonalizationFieldType = 'text'): FieldDraft {
  return {
    id: newFieldId(),
    type,
    label: '',
    required: false,
    placeholder: '',
    maxLength: String(PERSONALIZATION_TEXT_DEFAULT_MAX),
    choices: type === 'dropdown' ? [{ label: '', hex: '' }] : [],
  };
}

export function toDrafts(fields: PersonalizationField[]): FieldDraft[] {
  return fields.map((f) => ({
    ...emptyDraft(f.type),
    id: f.id,
    label: f.label,
    required: f.required,
    ...(f.type === 'text'
      ? { placeholder: f.placeholder, maxLength: String(f.maxLength) }
      : {}),
    ...(f.type === 'dropdown'
      ? { choices: f.choices.map((c) => ({ label: c.label, hex: c.hex ?? '' })) }
      : {}),
  }));
}

/** Drafts → the shape the API stores, or the first problem in plain words. */
export function fromDrafts(
  drafts: FieldDraft[],
): { ok: true; fields: PersonalizationField[] } | { ok: false; error: string } {
  const raw = drafts.map((d) => {
    const base = { id: d.id, label: d.label.trim(), required: d.required };
    if (d.type === 'text') {
      return {
        ...base,
        type: 'text' as const,
        placeholder: d.placeholder.trim(),
        maxLength: Number(d.maxLength),
      };
    }
    if (d.type === 'dropdown') {
      return {
        ...base,
        type: 'dropdown' as const,
        choices: d.choices
          .map((c) => ({ label: c.label.trim(), hex: c.hex }))
          .filter((c) => c.label)
          .map((c) => (c.hex ? c : { label: c.label })),
      };
    }
    return { ...base, type: 'checkbox' as const };
  });

  for (let i = 0; i < raw.length; i++) {
    const f = raw[i]!;
    const where = `Field ${i + 1}${f.label ? ` ("${f.label}")` : ''}`;
    if (!f.label) return { ok: false, error: `${where}: give it a name.` };
    if (f.type === 'dropdown' && f.choices.length === 0) {
      return { ok: false, error: `${where}: add at least one choice.` };
    }
    if (f.type === 'text' && !(Number.isInteger(f.maxLength) && f.maxLength >= 1)) {
      return { ok: false, error: `${where}: enter a max length of 1 or more.` };
    }
  }

  const parsed = personalizationFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const idx = typeof issue.path[0] === 'number' ? ` (field ${issue.path[0] + 1})` : '';
    return { ok: false, error: `${issue.message}${idx}.` };
  }
  return { ok: true, fields: parsed.data };
}

/** Canonical JSON used to tell whether the field list has unsaved changes. */
export function fieldsSignature(drafts: FieldDraft[]): string {
  const r = fromDrafts(drafts);
  return r.ok ? JSON.stringify(r.fields) : `invalid:${JSON.stringify(drafts)}`;
}
