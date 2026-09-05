import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStorefrontProduct } from '@/lib/storefront/queries';
import { ProductGallery } from '@/components/store/product-gallery';
import { VariantPicker } from '@/components/store/variant-picker';
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
  const images = product.images.length ? product.images.map((i) => i.url) : undefined;

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();

  const path = `/products/${product.slug}`;
  const price = (cents: number) => (cents / 100).toFixed(2);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: stripHtml(product.description) || `${product.title} from VIDNTEC.`,
    image: product.images.map((i) => i.url),
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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: absoluteUrl('/products') },
      { '@type': 'ListItem', position: 3, name: product.title, item: absoluteUrl(path) },
    ],
  };

  return (
    <div>
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />
      <nav className="mb-5 text-xs text-ink-muted">
        <Link href="/products" className="hover:text-ink">
          Products
        </Link>{' '}
        <span aria-hidden>/</span> <span className="text-ink-soft">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <div className="mt-6">
            <VariantPicker variants={product.variants} />
          </div>

          {product.description ? (
            <div className="mt-8 border-t border-paper-line pt-6">
              <h2 className="mb-2 text-sm font-semibold">Description</h2>
              <div
                className="text-sm leading-relaxed text-ink-soft [&_em]:italic [&_li]:mt-1 [&_li:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:my-3 [&_ul:first-child]:mt-0 [&_ul:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
