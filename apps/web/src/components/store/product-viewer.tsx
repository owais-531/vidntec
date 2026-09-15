'use client';

import { useState } from 'react';
import type { CustomizationColorOption, MediaType, PublicVariant } from '@vidntec/shared';
import { ProductGallery } from './product-gallery';
import { VariantPicker } from './variant-picker';

type Media = { url: string; position: number; type: MediaType; variantId: string | null };

/** Owns the selected-variant state shared by the gallery (which image is shown)
 *  and the variant picker (which variant the customer chose). */
export function ProductViewer({
  title,
  description,
  images,
  variants,
  customizationNameEnabled,
  customizationColorEnabled,
  customizationColorOptions,
}: {
  title: string;
  description: string;
  images: Media[];
  variants: PublicVariant[];
  customizationNameEnabled: boolean;
  customizationColorEnabled: boolean;
  customizationColorOptions: CustomizationColorOption[];
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
          />
        </div>

        {description ? (
          <div className="mt-8 border-t border-paper-line pt-6">
            <h2 className="mb-2 text-sm font-semibold">Description</h2>
            <div
              className="text-sm leading-relaxed text-ink-soft [&_em]:italic [&_li]:mt-1 [&_li:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:my-3 [&_ul:first-child]:mt-0 [&_ul:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
