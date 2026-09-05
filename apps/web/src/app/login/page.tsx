import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
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
            <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
            <p className="mb-5 text-xs text-ink-muted">Sign in to your account.</p>
            <LoginForm next={next} />
            <p className="mt-5 text-center text-xs text-ink-muted">
              New to VIDNTEC?{' '}
              <Link
                href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
                className="font-semibold text-brand-600 hover:underline"
              >
                Create an account
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
