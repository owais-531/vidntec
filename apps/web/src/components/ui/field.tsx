import { cn } from '@/lib/cn';

const baseInput =
  'w-full rounded-card border border-paper-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint ' +
  'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-paper-sunken';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-xs font-medium text-ink-soft', className)} {...props} />
  );
}

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(baseInput, className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(baseInput, 'min-h-24 resize-y', className)} {...props} />
);

export const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(baseInput, 'pr-8', className)} {...props} />
);

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-brand-600">{children}</p>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-brand-500" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
