import { Logo } from '@/components/ui/logo';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-paper-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-4" />
          <span>· 3D-printed products, made to order.</span>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <a href="mailto:info@vidntec.com" className="hover:text-ink">
            info@vidntec.com
          </a>
          <a
            href="https://wa.me/923175791001"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            +92 317 5791001
          </a>
        </div>
      </div>
    </footer>
  );
}
