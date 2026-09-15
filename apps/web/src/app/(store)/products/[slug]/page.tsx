import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getMyReview,
  getProductReviews,
  getStorefrontProduct,
  listStorefrontProducts,
} from '@/lib/storefront/queries';
import { getSessionClaims } from '@/lib/auth';
import { ProductViewer } from '@/components/store/product-viewer';
import { BackButton } from '@/components/store/back-button';
import { SectionHeading } from '@/components/store/section-heading';
import { ProductCard } from '@/components/store/product-card';
import { StarRating } from '@/components/store/star-rating';
import { ReviewList } from '@/components/store/review-list';
import { ReviewForm } from '@/components/store/review-form';
import { JsonLd } from '@/components/seo/json-ld';
import { SITE_URL, siteConfig, absoluteUrl } from '@/lib/site';
import { stripHtml } from '@/lib/strip-html';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) return { title: 'Not found' };

  const description =
    stripHtml(product.description).slice(0, 160) ||
    `${product.title} — a made-to-order 3D-printed product from VIDNTEC.`;
  const path = `/products/${product.slug}`;
  const imageUrls = product.images.filter((i) => i.type === 'image').map((i) => i.url);
  const images = imageUrls.length ? imageUrls : undefined;

  return {
    title: product.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: path,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewsPage?: string }>;
}) {
  const { slug } = await params;
  const { reviewsPage } = await searchParams;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();

  const reviewsPageNum = Math.max(1, Number(reviewsPage ?? '1') || 1);
  const [reviews, session] = await Promise.all([
    getProductReviews(product.id, reviewsPageNum),
    getSessionClaims(),
  ]);
  const myReview = session ? await getMyReview(product.id) : null;

  const suggested = product.category
    ? (
        await listStorefrontProducts({
          category: product.category.slug,
          sort: 'newest',
          pageSize: 4,
        })
      ).items.filter((p) => p.slug !== product.slug).slice(0, 3)
    : [];

  const path = `/products/${product.slug}`;
  const price = (cents: number) => (cents / 100).toFixed(2);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: stripHtml(product.description) || `${product.title} from VIDNTEC.`,
    image: product.images.filter((i) => i.type === 'image').map((i) => i.url),
    url: absoluteUrl(path),
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: siteConfig.currency,
      lowPrice: price(product.priceMin),
      highPrice: price(product.priceMax),
      offerCount: product.variants.length,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: absoluteUrl(path),
    },
  };

  const crumbs = [
    { name: 'Home', item: SITE_URL },
    { name: 'Products', item: absoluteUrl('/products') },
    ...(product.category
      ? [{ name: product.category.name, item: absoluteUrl(`/categories/${product.category.slug}`) }]
      : []),
    { name: product.title, item: absoluteUrl(path) },
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <div>
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />
      <BackButton />
      <nav className="mb-5 text-xs text-ink-muted">
        <Link href="/products" className="hover:text-ink">
          Products
        </Link>{' '}
        {product.category ? (
          <>
            <span aria-hidden>/</span>{' '}
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-ink"
            >
              {product.category.name}
            </Link>{' '}
          </>
        ) : null}
        <span aria-hidden>/</span> <span className="text-ink-soft">{product.title}</span>
      </nav>

      <ProductViewer
        title={product.title}
        description={product.description}
        images={product.images}
        variants={product.variants}
        customizationNameEnabled={product.customizationNameEnabled}
        customizationColorEnabled={product.customizationColorEnabled}
        customizationColorOptions={product.customizationColorOptions}
      />

      <section className="mt-12">
        <SectionHeading title="Reviews" />
        <div className="mb-6 flex items-center gap-2">
          <StarRating value={product.avgRating} />
          <span className="text-sm text-ink-soft">
            {product.avgRating != null ? product.avgRating.toFixed(1) : '—'} out of 5 ·{' '}
            {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
          </span>
        </div>

        {session ? (
          <div className="mb-6">
            <ReviewForm
              key={myReview?.id ?? 'new'}
              productId={product.id}
              productSlug={product.slug}
              existing={myReview}
            />
          </div>
        ) : (
          <p className="mb-6 text-sm text-ink-muted">
            <Link href={`/login?next=/products/${product.slug}`} className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>{' '}
            to write a review.
          </p>
        )}

        <ReviewList
          reviews={reviews.items}
          page={reviews.page}
          lastPage={Math.max(1, Math.ceil(reviews.total / reviews.pageSize))}
          slug={product.slug}
        />
      </section>

      {suggested.length > 0 ? (
        <section className="mt-12">
          <SectionHeading title="Suggested products" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suggested.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
