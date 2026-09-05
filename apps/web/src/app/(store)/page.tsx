import type { Metadata } from 'next';
import Link from 'next/link';
import { listStorefrontProducts } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductGrid } from '@/components/store/product-grid';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonClasses } from '@/components/ui/button';
import { SITE_URL, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  // Home owns the brand title outright — no "· VIDNTEC" suffix.
  title: { absolute: siteConfig.title },
  alternates: { canonical: '/' },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: siteConfig.name,
  url: SITE_URL,
  description: siteConfig.description,
  logo: `${SITE_URL}/icon.png`,
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/products?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default async function HomePage() {
  const [latest, trending, onSale] = await Promise.all([
    listStorefrontProducts({ sort: 'newest', pageSize: 10 }),
    listStorefrontProducts({ featured: true, pageSize: 10 }),
    listStorefrontProducts({ onSale: true, pageSize: 10 }),
  ]);
  const { items, total } = latest;

  return (
    <div className="space-y-10">
      <JsonLd data={[orgJsonLd, websiteJsonLd]} />
      <section className="overflow-hidden rounded-card bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-12 text-white sm:px-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Made to order
        </p>
        <h1 className="mt-3 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
          Precision 3D-printed products, shipped to your door.
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/80">
          A curated catalog of functional and decorative prints. Pick a finish, place your order,
          and we print it fresh.
        </p>
        <Link
          href="/products"
          className={buttonClasses('secondary', 'md', 'mt-6 !text-brand-600')}
        >
          Shop the catalog
        </Link>
      </section>

      <section>
        <SectionHeading
          title="Latest products"
          href="/products"
          linkLabel={`All ${total} products`}
        />
        <ProductGrid products={items} />
      </section>

      {trending.items.length > 0 ? (
        <section>
          <SectionHeading title="Trending" href="/products" linkLabel="Shop all" />
          <ProductGrid products={trending.items} />
        </section>
      ) : null}

      {onSale.items.length > 0 ? (
        <section>
          <SectionHeading title="On sale" href="/products" linkLabel="Shop all" />
          <ProductGrid products={onSale.items} />
        </section>
      ) : null}
    </div>
  );
}
