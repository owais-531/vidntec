import Link from 'next/link';

export function SectionHeading({
  title,
  href,
  linkLabel = 'View all',
  as: Heading = 'h2',
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <Heading className="section-heading text-xl">
        <span aria-hidden className="text-brand-500">
          ⚡
        </span>
        {title}
      </Heading>
      {href ? (
        <Link
          href={href}
          className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          {linkLabel}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white transition-transform group-hover:translate-x-0.5">
            ›
          </span>
        </Link>
      ) : null}
    </div>
  );
}
