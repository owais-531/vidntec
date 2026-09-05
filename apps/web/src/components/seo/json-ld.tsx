/**
 * Renders a <script type="application/ld+json"> block. Pass a single schema.org
 * object or an array of them. Content is server-rendered, static, and trusted
 * (built from our own data), so dangerouslySetInnerHTML is appropriate here.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
