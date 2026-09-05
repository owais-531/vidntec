import type { PublicProductListItem } from '@vidntec/shared';
import { ProductCard } from './product-card';

export function ProductGrid({ products }: { products: PublicProductListItem[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-card bg-white py-16 text-center text-sm text-ink-muted">
        No products found.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
