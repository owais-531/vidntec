import type { PersonalizationSelection } from '@vidntec/shared';

/**
 * "Label: value" lines for a cart or order line's personalization, with the
 * colour swatch when a dropdown choice has one. Renders nothing when empty.
 */
export function PersonalizationSummary({
  selections,
  className = 'mt-0.5 text-xs text-ink-soft',
}: {
  selections: PersonalizationSelection[];
  className?: string;
}) {
  if (selections.length === 0) return null;
  return (
    <ul className={className}>
      {selections.map((s) => (
        <li key={s.fieldId} className="flex items-center gap-1.5">
          <span className="text-ink-muted">{s.label}:</span>
          <span className="inline-flex items-center gap-1">
            {s.hex ? (
              <span
                className="h-2.5 w-2.5 rounded-full border border-paper-line"
                style={{ backgroundColor: s.hex }}
                aria-hidden
              />
            ) : null}
            {s.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
