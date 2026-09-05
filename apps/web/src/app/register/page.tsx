import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-sunken px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center hover:opacity-80">
          <Logo className="h-8" priority />
        </Link>
        <Card>
          <CardBody>
            <h1 className="mb-1 text-lg font-semibold">Create an account</h1>
            <p className="mb-5 text-xs text-ink-muted">
              Track your orders and check out faster next time. We&apos;ll email you a 6-digit
              code to verify your address.
            </p>
            <RegisterForm next={next} />
            <p className="mt-5 text-center text-xs text-ink-muted">
              Already have an account?{' '}
              <Link
                href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                className="font-semibold text-brand-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
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
