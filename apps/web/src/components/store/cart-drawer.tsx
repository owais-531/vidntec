'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { formatMoney, type CartLine, type CartView } from '@vidntec/shared';
import { removeCartLineAction } from '@/lib/cart/actions';
import { buttonClasses } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { GiftProgressBanner } from './gift-progress-banner';

/**
 * "Added to cart" feedback. Desktop (≥ sm): right-side drawer listing the cart.
 * Mobile: a compact bar docked to the bottom so the page stays visible.
 * Same overlay architecture as `category-sidebar.tsx` (fixed, no content push).
 */

const MINI_BAR_MS = 8000;
const DESKTOP_QUERY = '(min-width: 640px)';

interface DrawerState {
  open: boolean;
  /** Set when opened by an add-to-cart (vs. the header icon) */
  justAdded: boolean;
  addedVariantId: string | null;
}

interface CartDrawerContextValue extends DrawerState {
  cart: CartView;
  /** Show the overlay right after an add-to-cart, using the returned cart. */
  showAdded: (cart: CartView, variantId: string) => void;
  /** Header cart icon: opens the drawer on desktop; returns false on mobile / cart pages. */
  openFromHeader: () => boolean;
  close: () => void;
  setCart: (cart: CartView) => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({
  cart: serverCart,
  children,
}: {
  cart: CartView;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<DrawerState>({
    open: false,
    justAdded: false,
    addedVariantId: null,
  });
  // Freshest cart we know of (from an action response) until the server re-renders.
  const [latest, setLatest] = useState<CartView | null>(null);

  useEffect(() => setLatest(null), [serverCart]);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  useEffect(() => close(), [pathname, close]);

  const showAdded = useCallback((cart: CartView, variantId: string) => {
    setLatest(cart);
    setState({ open: true, justAdded: true, addedVariantId: variantId });
  }, []);

  const openFromHeader = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia(DESKTOP_QUERY).matches) return false;
    if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return false;
    setState({ open: true, justAdded: false, addedVariantId: null });
    return true;
  }, [pathname]);

  return (
    <CartDrawerContext.Provider
      value={{
        ...state,
        cart: latest ?? serverCart,
        showAdded,
        openFromHeader,
        close,
        setCart: setLatest,
      }}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  return useContext(CartDrawerContext);
}

/** Header cart link: opens the drawer on desktop, plain navigation to /cart otherwise. */
export function CartHeaderLink({ count, children }: { count: number; children: React.ReactNode }) {
  const ctx = useCartDrawer();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      className="flex items-center gap-1.5 hover:opacity-90"
      onClick={(e) => {
        if (ctx?.openFromHeader()) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}

export function CartDrawer() {
  const ctx = useCartDrawer();
  if (!ctx) return null;
  return (
    <>
      <DesktopDrawer ctx={ctx} />
      <MobileMiniBar ctx={ctx} />
    </>
  );
}

function LineThumb({ line, size }: { line: CartLine; size: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded bg-paper-sunken"
      style={{ width: size, height: size }}
    >
      {line.imageUrl ? (
        <Image src={line.imageUrl} alt="" fill sizes={`${size}px`} className="object-contain p-1" />
      ) : (
        <span className="flex h-full items-center justify-center text-ink-faint">⚡</span>
      )}
    </span>
  );
}

function DesktopDrawer({ ctx }: { ctx: CartDrawerContextValue }) {
  const { open, justAdded, cart, close, setCart } = ctx;
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const remove = async (itemId: string) => {
    setRemoving(itemId);
    const res = await removeCartLineAction(itemId);
    setRemoving(null);
    if (res.ok) {
      setCart(res.data);
      router.refresh();
    } else {
      toast(res.error, 'error');
    }
  };

  return (
    <div className="hidden sm:block">
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[400px] max-w-full transform flex-col bg-white shadow-pop outline-none transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">
            {justAdded ? '✓ Added to cart' : 'Your cart'}
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center text-ink-muted hover:text-ink"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
            <p className="text-sm text-ink-muted">Your cart is empty.</p>
            <button type="button" onClick={close} className={buttonClasses('secondary', 'sm')}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-paper-line overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <li
                  key={line.itemId}
                  className={`flex gap-3 py-4 ${removing === line.itemId ? 'opacity-50' : ''}`}
                >
                  <Link href={`/products/${line.productSlug}`} onClick={close}>
                    <LineThumb line={line} size={64} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${line.productSlug}`}
                      onClick={close}
                      className="text-sm font-medium text-ink hover:text-brand-600"
                    >
                      {line.productTitle}
                    </Link>
                    <p className="text-xs text-ink-muted">{line.variantName}</p>
                    {line.customName || line.customColorLabel ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
                        {line.customName ? <span>“{line.customName}”</span> : null}
                        {line.customColorLabel ? (
                          <span className="inline-flex items-center gap-1">
                            {line.customColorHex ? (
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-paper-line"
                                style={{ backgroundColor: line.customColorHex }}
                                aria-hidden
                              />
                            ) : null}
                            {line.customColorLabel}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-soft">
                      {line.quantity} × {formatMoney(line.unitPrice)}
                    </p>
                    <button
                      type="button"
                      disabled={removing !== null}
                      onClick={() => remove(line.itemId)}
                      className="mt-1 text-xs text-ink-muted underline underline-offset-2 hover:text-brand-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {formatMoney(line.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-paper-line px-5 py-4">
              <GiftProgressBanner subtotal={cart.subtotal} />
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold text-ink">{formatMoney(cart.subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={close}
                  className={buttonClasses('secondary', 'md', 'w-full justify-center text-center')}
                >
                  View cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={close}
                  className={buttonClasses('primary', 'md', 'w-full justify-center text-center')}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function MobileMiniBar({ ctx }: { ctx: CartDrawerContextValue }) {
  const { open, justAdded, addedVariantId, cart, close } = ctx;

  // Auto-dismiss so the bar never lingers over the page.
  useEffect(() => {
    if (!open || !justAdded) return;
    const t = setTimeout(close, MINI_BAR_MS);
    return () => clearTimeout(t);
  }, [open, justAdded, addedVariantId, cart, close]);

  const line = cart.lines.find((l) => l.variantId === addedVariantId) ?? cart.lines[0];
  const visible = open && justAdded && Boolean(line);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-50 transform border-t border-paper-line bg-white p-3 shadow-pop transition-transform duration-200 sm:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      {line ? (
        <>
          <div className="flex items-center gap-3">
            <LineThumb line={line} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-600">✓ Added to cart</p>
              <p className="truncate text-sm text-ink">
                {line.productTitle}
                <span className="text-ink-muted"> · {line.variantName}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center text-ink-muted hover:text-ink"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/cart"
              onClick={close}
              className={buttonClasses('secondary', 'sm', 'w-full justify-center text-center')}
            >
              View cart ({cart.itemCount})
            </Link>
            <Link
              href="/checkout"
              onClick={close}
              className={buttonClasses('primary', 'sm', 'w-full justify-center text-center')}
            >
              Checkout
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
