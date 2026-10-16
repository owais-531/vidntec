import { z } from 'zod';
import {
  PERSONALIZATION_CHECKED_VALUE,
  PERSONALIZATION_FIELD_TYPES,
  PERSONALIZATION_MAX_CHOICES,
  PERSONALIZATION_MAX_FIELDS,
  PERSONALIZATION_TEXT_DEFAULT_MAX,
  PERSONALIZATION_TEXT_HARD_MAX,
} from '../constants';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex color like #8a1a1c');

/** A short stable id, e.g. "name" — what carts/orders key a customer's answer by. */
export const personalizationFieldIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,31}$/, 'invalid field id');

export const personalizationChoiceSchema = z.object({
  label: z.string().trim().min(1).max(40),
  /** Optional colour swatch shown next to the choice. */
  hex: hex.optional(),
});
export type PersonalizationChoice = z.infer<typeof personalizationChoiceSchema>;

const base = {
  id: personalizationFieldIdSchema,
  label: z.string().trim().min(1).max(60),
  required: z.boolean().default(false),
};

export const personalizationFieldSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('text'),
    placeholder: z.string().trim().max(80).default(''),
    maxLength: z
      .number()
      .int()
      .min(1)
      .max(PERSONALIZATION_TEXT_HARD_MAX)
      .default(PERSONALIZATION_TEXT_DEFAULT_MAX),
  }),
  z.object({
    ...base,
    type: z.literal('dropdown'),
    choices: z.array(personalizationChoiceSchema).min(1, 'Add at least one choice').max(PERSONALIZATION_MAX_CHOICES),
  }),
  z.object({
    ...base,
    type: z.literal('checkbox'),
  }),
]);
export type PersonalizationField = z.infer<typeof personalizationFieldSchema>;

/** The product's full field list: ≤ 8, unique ids, unique labels. */
export const personalizationFieldsSchema = z
  .array(personalizationFieldSchema)
  .max(PERSONALIZATION_MAX_FIELDS)
  .superRefine((fields, ctx) => {
    const ids = new Set<string>();
    const labels = new Set<string>();
    fields.forEach((f, i) => {
      const label = f.label.toLowerCase();
      if (ids.has(f.id) || labels.has(label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each field needs a unique name',
          path: [i, 'label'],
        });
      }
      ids.add(f.id);
      labels.add(label);
      if (f.type === 'dropdown') {
        const seen = new Set<string>();
        f.choices.forEach((c, j) => {
          if (seen.has(c.label.toLowerCase())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Choices must be unique',
              path: [i, 'choices', j, 'label'],
            });
          }
          seen.add(c.label.toLowerCase());
        });
      }
    });
  });

/** What the customer sends: field id → raw answer (checkbox: "true"). */
export const personalizationInputSchema = z.record(personalizationFieldIdSchema, z.string().max(200));
export type PersonalizationInput = z.infer<typeof personalizationInputSchema>;

/**
 * One answered field as stored on a cart line and snapshotted on an order line.
 * `label` is copied so later edits to the product never rewrite old orders.
 */
export const personalizationSelectionSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  type: z.enum(PERSONALIZATION_FIELD_TYPES),
  value: z.string(),
  /** Swatch colour of a chosen dropdown option, if it has one. */
  hex: z.string().nullable().optional(),
});
export type PersonalizationSelection = z.infer<typeof personalizationSelectionSchema>;

/**
 * Validates a customer's answers against a product's fields and returns what to
 * store. Empty optional fields are dropped; unknown ids are ignored; a
 * dropdown's hex always comes from the admin's own choice, never the client.
 */
export function resolvePersonalization(
  fields: PersonalizationField[],
  input: PersonalizationInput,
): { selections: PersonalizationSelection[]; errors: Record<string, string> } {
  const selections: PersonalizationSelection[] = [];
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const raw = (input[f.id] ?? '').trim();

    if (f.type === 'checkbox') {
      if (raw === 'true') {
        selections.push({ fieldId: f.id, label: f.label, type: f.type, value: PERSONALIZATION_CHECKED_VALUE });
      } else if (f.required) {
        errors[f.id] = `Please tick "${f.label}"`;
      }
      continue;
    }

    if (!raw) {
      if (f.required) errors[f.id] = `${f.label} is required`;
      continue;
    }

    if (f.type === 'text') {
      if (raw.length > f.maxLength) {
        errors[f.id] = `${f.label} can be at most ${f.maxLength} characters`;
        continue;
      }
      selections.push({ fieldId: f.id, label: f.label, type: f.type, value: raw });
    } else {
      const choice = f.choices.find((c) => c.label === raw);
      if (!choice) {
        errors[f.id] = `Please choose a valid ${f.label}`;
        continue;
      }
      selections.push({
        fieldId: f.id,
        label: f.label,
        type: f.type,
        value: choice.label,
        hex: choice.hex ?? null,
      });
    }
  }

  return { selections, errors };
}

/** Canonical string for "same personalization" — used to merge or split cart lines. */
export function personalizationKey(selections: ReadonlyArray<{ fieldId: string; value: string }>): string {
  return JSON.stringify(selections.map((s) => [s.fieldId, s.value]));
}
