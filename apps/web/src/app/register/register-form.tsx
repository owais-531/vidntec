'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signupAction, type SignupState } from '@/lib/actions/auth';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<SignupState, FormData>(signupAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 10 characters"
        error={state.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword?.[0]}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {state.error ? (
        <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
