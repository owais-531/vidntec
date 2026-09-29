import type { Metadata } from 'next';
import Link from 'next/link';
import { listStorefrontCategories, listStorefrontProducts } from '@/lib/storefront/queries';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductGrid } from '@/components/store/product-grid';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonClasses } from '@/components/ui/button';
import { whatsappUrl } from '@/lib/whatsapp';
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
  const categories = await listStorefrontCategories();
  const featuredCategories = categories.filter((c) => c.featuredOnHome);

  const [latest, trending, onSale, ...featuredCategoryProducts] = await Promise.all([
    listStorefrontProducts({ sort: 'newest', pageSize: 10 }),
    listStorefrontProducts({ featured: true, pageSize: 10 }),
    listStorefrontProducts({ onSale: true, pageSize: 10 }),
    ...featuredCategories.map((c) =>
      listStorefrontProducts({ category: c.slug, sort: 'newest', pageSize: 10 }),
    ),
  ]);
  const { items, total } = latest;
  const categorySections = featuredCategories.map((c, i) => ({
    category: c,
    products: featuredCategoryProducts[i]!.items,
  }));

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-card bg-brand-500 px-8 py-12 text-white sm:px-12 sm:py-16">
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
        {/* 2×2 on sm+: equal 1fr columns on a fit-content grid → every button matches the widest one */}
        <div className="mt-6 grid gap-3 sm:w-fit sm:grid-cols-2">
          <a
            href={whatsappUrl('Hello, I want to place a custom order')}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('secondary', 'md', 'w-full !text-brand-600')}
          >
            Place custom order
          </a>
          <Link
            href="/products"
            className={buttonClasses('secondary', 'md', 'w-full !text-brand-600')}
          >
            Shop the catalog
          </Link>
          <Link
            href="/categories/engineered-products"
            className={buttonClasses('secondary', 'md', 'w-full !text-brand-600')}
          >
            View Engineered Products
          </Link>
          <Link
            href="/categories/cad-design"
            className={buttonClasses('secondary', 'md', 'w-full !text-brand-600')}
          >
            View CAD Design
          </Link>
        </div>
      </section>

      <JsonLd data={[orgJsonLd, websiteJsonLd]} />

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

      {categorySections.map(({ category, products }) =>
        products.length > 0 ? (
          <section key={category.slug}>
            <SectionHeading
              title={category.name}
              href={`/categories/${category.slug}`}
              linkLabel="Shop all"
            />
            <ProductGrid products={products} />
          </section>
        ) : null,
      )}

      <section>
        <SectionHeading
          title="Products catalog"
          href="/products"
          linkLabel={`All ${total} products`}
        />
        <ProductGrid products={items} />
        <div className="mt-6 flex justify-center">
          <Link href="/products" className={buttonClasses('secondary', 'md')}>
            View all products
          </Link>
        </div>
      </section>
    </div>
  );
}
