import { SectionHeading } from '@/components/store/section-heading';
import { Card, CardBody } from '@/components/ui/card';

export function LegalContent({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeading title={title} as="h1" />
      <p className="mb-5 text-xs text-ink-muted">Last updated {lastUpdated}</p>
      <Card>
        <CardBody
          className="space-y-4 text-sm leading-relaxed text-ink-soft [&_h2]:mt-6 [&_h2:first-child]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        >
          {children}
        </CardBody>
      </Card>
    </div>
  );
}
