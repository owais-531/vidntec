'use client';

import { useState } from 'react';
import type {
  CustomizationColorOption,
  MediaType,
  ProductSpec,
  PublicVariant,
} from '@vidntec/shared';
import { ProductGallery } from './product-gallery';
import { VariantPicker } from './variant-picker';

type Media = { url: string; position: number; type: MediaType; variantId: string | null };

/** Styles for admin-authored rich text (sanitized server-side to p/strong/em/u/ul/li/br). */
const RICH_TEXT_CLASSES =
  'text-sm leading-relaxed text-ink-soft [&_em]:italic [&_li]:mt-1 [&_li:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:my-3 [&_ul:first-child]:mt-0 [&_ul:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_u]:underline';

/** Owns the selected-variant state shared by the gallery (which image is shown)
 *  and the variant picker (which variant the customer chose). */
export function ProductViewer({
  title,
  description,
  scope,
  images,
  variants,
  customizationNameEnabled,
  customizationColorEnabled,
  customizationColorOptions,
  specs,
  productUrl,
}: {
  title: string;
  description: string;
  scope: string;
  images: Media[];
  variants: PublicVariant[];
  customizationNameEnabled: boolean;
  customizationColorEnabled: boolean;
  customizationColorOptions: CustomizationColorOption[];
  specs: ProductSpec[];
  productUrl: string;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>();

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductGallery images={images} title={title} selectedVariantId={selectedVariantId} />

      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-6">
          <VariantPicker
            variants={variants}
            customizationNameEnabled={customizationNameEnabled}
            customizationColorEnabled={customizationColorEnabled}
            customizationColorOptions={customizationColorOptions}
            onVariantChange={setSelectedVariantId}
            productUrl={productUrl}
          />
        </div>

        {description ? (
          <div className="mt-8 border-t border-paper-line pt-6">
            <h2 className="mb-2 text-sm font-semibold">Description</h2>
            <div className={RICH_TEXT_CLASSES} dangerouslySetInnerHTML={{ __html: description }} />
          </div>
        ) : null}

        {specs.length > 0 ? (
          <div className="mt-8 border-t border-paper-line pt-6">
            <h2 className="mb-2 text-sm font-semibold">Details</h2>
            <dl className="divide-y divide-paper-line text-sm">
              {specs.map((s, i) => (
                <div key={i} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink-muted">{s.label}</dt>
                  <dd className="text-right font-medium text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {/* Long-form technical text — spans the full width below the gallery + info columns. */}
      {scope ? (
        <div className="border-t border-paper-line pt-6 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Scope</h2>
          <div className={RICH_TEXT_CLASSES} dangerouslySetInnerHTML={{ __html: scope }} />
        </div>
      ) : null}
    </div>
  );
}
