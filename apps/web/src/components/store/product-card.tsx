import Image from 'next/image';
import Link from 'next/link';
import type { PublicProductListItem } from '@vidntec/shared';
import { Price } from './price';

export function ProductCard({ product }: { product: PublicProductListItem }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-card bg-white p-3 transition-shadow hover:shadow-card"
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded bg-paper-sunken">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain p-2 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-ink-faint">⚡</div>
        )}
        {!product.inStock ? (
          <span className="absolute left-2 top-2 rounded bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        ) : product.onSale ? (
          <span className="absolute left-2 top-2 rounded bg-brand-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {product.discountPercent > 0 ? `-${product.discountPercent}%` : 'Sale'}
          </span>
        ) : null}
      </div>
      <h3 className="line-clamp-2 min-h-[2.5rem] text-sm text-ink-soft group-hover:text-ink">
        {product.title}
      </h3>
      <Price
        min={product.priceMin}
        max={product.priceMax}
        originalMin={product.originalPriceMin}
        originalMax={product.originalPriceMax}
        onSale={product.onSale}
        className="mt-1.5 text-base"
      />
    </Link>
  );
}
