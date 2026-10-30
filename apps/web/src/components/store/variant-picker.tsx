'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
  formatMoney,
  resolvePersonalization,
  type PersonalizationField,
  type PersonalizationInput,
  type PublicVariant,
} from '@vidntec/shared';
import { cn } from '@/lib/cn';
import { addToCartAction } from '@/lib/cart/actions';
import { generatePreviewAction } from '@/lib/actions/preview';
import { useCartDrawer } from './cart-drawer';
import { whatsappUrl } from '@/lib/whatsapp';
import { Button, buttonClasses } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { WhatsappIcon } from './whatsapp-icon';
import { PersonalizationForm } from './personalization-form';

export function VariantPicker({
  variants,
  productTitle,
  personalizationFields = [],
  previewEnabled = false,
  previewFields = { nameId: null, initialId: null, colourId: null },
  productSlug,
  onVariantChange,
  productUrl,
}: {
  variants: PublicVariant[];
  productTitle: string;
  /** Admin-defined "Make it yours" fields; empty = product has no personalization. */
  personalizationFields?: PersonalizationField[];
  /** Offer the AI "Preview" button under the product's name field. */
  previewEnabled?: boolean;
  /** Which personalization field ids feed the preview (set in admin). */
  previewFields?: { nameId: string | null; initialId: string | null; colourId: string | null };
  productSlug: string;
  /** Fires with the selected variant's id, including once for the initial default. */
  onVariantChange?: (variantId: string) => void;
  productUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(
    variants.find((v) => v.inStock)?.id ?? variants[0]?.id ?? '',
  );
  const cartDrawer = useCartDrawer();
  const [qty, setQty] = useState(1);
  const [answers, setAnswers] = useState<PersonalizationInput>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{
    status: 'idle' | 'loading' | 'done' | 'error';
    image?: string;
    /** name + variant the shown image was made for — to flag it stale once either changes */
    key?: string;
    remaining?: number | null;
    error?: string;
  }>({ status: 'idle' });
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  useEffect(() => {
    if (selectedId) onVariantChange?.(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!selected) return null;

  const maxQty = Math.max(1, Math.min(selected.stock, 99));
  // The preview reads the fields the admin mapped: name, optional initial, optional colour.
  const nameField = personalizationFields.find(
    (f) => f.type === 'text' && f.id === previewFields.nameId,
  );
  const customName = nameField ? (answers[nameField.id] ?? '') : '';
  const initialAnswer = previewFields.initialId
    ? (answers[previewFields.initialId] ?? '').trim()
    : '';
  const colourAnswer = previewFields.colourId ? (answers[previewFields.colourId] ?? '') : '';
  const showPreview = previewEnabled && !!nameField;
  const previewKey = `${customName.trim()}|${initialAnswer}|${colourAnswer}|${selected.id}`;
  const previewStale = preview.status === 'done' && preview.key !== previewKey;

  const makePreview = () => {
    const name = customName.trim();
    if (!name) {
      toast('Type a name first to see the preview', 'error');
      return;
    }
    const key = previewKey;
    setPreview((p) => ({ ...p, status: 'loading', error: undefined }));
    startTransition(async () => {
      const res = await generatePreviewAction(productSlug, selected.id, name, {
        ...(initialAnswer ? { initial: initialAnswer } : {}),
        ...(colourAnswer ? { colourChoice: colourAnswer } : {}),
      });
      if (res.ok) {
        setPreview({
          status: 'done',
          image: res.data.imageDataUrl,
          key,
          remaining: res.data.remaining,
        });
      } else {
        setPreview((p) => ({
          ...p,
          status: 'error',
          error: res.fieldErrors?.name?.[0] ?? res.error,
        }));
      }
    });
  };

  const setAnswer = (fieldId: string, value: string) => {
    setAnswers((a) => ({ ...a, [fieldId]: value }));
    setAnswerErrors((e) => {
      if (!e[fieldId]) return e;
      const { [fieldId]: _drop, ...rest } = e;
      return rest;
    });
  };

  const addToCart = () => {
    const { errors } = resolvePersonalization(personalizationFields, answers);
    if (Object.keys(errors).length > 0) {
      setAnswerErrors(errors);
      toast(Object.values(errors)[0]!, 'error');
      return;
    }
    setAnswerErrors({});
    startTransition(async () => {
      const res = await addToCartAction(selected.id, qty, answers);
      if (res.ok) {
        cartDrawer?.showAdded(res.data, selected.id);
        router.refresh();
      } else {
        toast(res.error, 'error');
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold text-brand-500">{formatMoney(selected.price)}</span>
        {selected.onSale && selected.compareAtPrice != null ? (
          <>
            <span className="text-base text-ink-muted line-through">
              {formatMoney(selected.compareAtPrice)}
            </span>
            <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-semibold text-white">
              -{Math.round((1 - selected.price / selected.compareAtPrice) * 100)}%
            </span>
          </>
        ) : null}
      </div>

      {variants.length > 1 ? (
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted">
            Option
          </span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setQty(1);
                }}
                className={cn(
                  'rounded-card border px-3 py-2 text-sm transition-colors',
                  v.id === selectedId
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-paper-line bg-white text-ink-soft hover:border-ink-faint',
                  !v.inStock && 'opacity-50',
                )}
              >
                {v.name}
                {!v.inStock ? <span className="ml-1 text-xs">(sold out)</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs font-medium">
        {selected.inStock ? (
          <span className="text-accent-600">
            In stock{selected.stock <= 5 ? ` — only ${selected.stock} left` : ''}
          </span>
        ) : (
          <span className="text-ink-muted">Currently sold out</span>
        )}
      </p>

      <PersonalizationForm
        productTitle={productTitle}
        fields={personalizationFields}
        values={answers}
        onChange={setAnswer}
        errors={answerErrors}
        renderAfter={(field) =>
          field.id === nameField?.id ? (
            <>
              {showPreview ? (
                <div className="mt-3 space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={makePreview}
                    disabled={preview.status === 'loading' || !customName.trim()}
                  >
                    {preview.status === 'loading'
                      ? 'Creating your preview…'
                      : preview.status === 'done'
                        ? 'Preview again'
                        : 'Preview with this name'}
                  </Button>

                  {preview.status === 'loading' ? (
                    <div
                      className="flex aspect-[2/3] w-full max-w-xs animate-pulse flex-col items-center justify-center gap-2 rounded-card border border-paper-line bg-paper-sunken p-4 text-center"
                      role="status"
                    >
                      <span className="text-sm font-medium text-ink-soft">
                        Creating your preview…
                      </span>
                      <span className="text-xs text-ink-muted">This takes about 20 seconds.</span>
                    </div>
                  ) : null}

                  {preview.status === 'error' ? (
                    <p className="rounded-card bg-brand-50 px-3 py-2 text-xs text-brand-700">
                      {preview.error}
                    </p>
                  ) : null}

                  {preview.image && preview.status !== 'loading' ? (
                    <figure className="max-w-xs space-y-2">
                      <Image
                        src={preview.image}
                        alt={`Preview of this product personalized with the name ${customName.trim()}`}
                        width={512}
                        height={768}
                        unoptimized
                        className="h-auto w-full rounded-card border border-paper-line bg-white"
                      />
                      <figcaption className="text-xs text-ink-muted">
                        {previewStale
                          ? 'This preview is for a different name or option — click “Preview again” to update it.'
                          : 'AI-generated preview — your final product may vary slightly.'}
                        {typeof preview.remaining === 'number'
                          ? ` ${preview.remaining} preview${preview.remaining === 1 ? '' : 's'} left today.`
                          : null}
                      </figcaption>
                    </figure>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null
        }
      />

      <div>
        <span
          id="quantity-label"
          className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted"
        >
          Quantity
        </span>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-labelledby="quantity-label"
            className="flex items-center rounded-card border border-paper-line bg-white"
          >
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-ink-soft hover:text-ink"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="px-3 py-2 text-ink-soft hover:text-ink disabled:opacity-30"
              disabled={qty >= maxQty}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <Button className="flex-1" onClick={addToCart} disabled={pending || !selected.inStock}>
            {pending ? 'Adding…' : selected.inStock ? 'Add to cart' : 'Sold out'}
          </Button>
        </div>
      </div>

      <a
        href={whatsappUrl(`Hello, I want to order this product: ${productUrl}`)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses(
          'primary',
          'md',
          'w-full gap-2 !border-0 !bg-[#25D366] !text-white hover:!bg-[#1ebe5b]',
        )}
      >
        <WhatsappIcon size={18} />
        Order via WhatsApp
      </a>
    </div>
  );
}
