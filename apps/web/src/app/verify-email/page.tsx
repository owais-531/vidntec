import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { VerifyEmailForm } from './verify-email-form';

export const metadata: Metadata = { title: 'Verify your email' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  if (!email) redirect('/register');

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-sunken px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center hover:opacity-80">
          <Logo className="h-8" priority />
        </Link>
        <Card>
          <CardBody>
            <h1 className="mb-1 text-lg font-semibold">Verify your email</h1>
            <p className="mb-5 text-xs text-ink-muted">
              We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.
              Enter it below to finish creating your account.
            </p>
            <VerifyEmailForm email={email} next={next} />
          </CardBody>
        </Card>
        <p className="mt-4 text-center text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink">
            ← Back to store
          </Link>
        </p>
      </div>
    </main>
  );
}
