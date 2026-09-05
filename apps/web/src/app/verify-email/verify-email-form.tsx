'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { resendOtpAction, verifyOtpAction, type VerifyOtpState } from '@/lib/actions/auth';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

const RESEND_COOLDOWN_SECONDS = 30;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Verifying…' : 'Verify email'}
    </Button>
  );
}

export function VerifyEmailForm({ email, next }: { email: string; next?: string }) {
  const [state, formAction] = useActionState<VerifyOtpState, FormData>(verifyOtpAction, {});
  const [resendPending, startResend] = useTransition();
  const [resendMessage, setResendMessage] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = () => {
    setResendMessage(undefined);
    startResend(async () => {
      const res = await resendOtpAction(email);
      setResendMessage(res.ok ? 'A new code has been sent.' : res.error);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  };

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field label="Verification code" htmlFor="code" error={state.fieldErrors?.code?.[0]}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            required
          />
        </Field>

        {state.error ? (
          <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">{state.error}</p>
        ) : null}

        <SubmitButton />
      </form>

      <div className="text-center text-xs text-ink-muted">
        Didn&apos;t get a code?{' '}
        <button
          type="button"
          onClick={resend}
          disabled={resendPending || cooldown > 0}
          className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
        {resendMessage ? <p className="mt-1">{resendMessage}</p> : null}
      </div>
    </div>
  );
}
