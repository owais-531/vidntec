/* eslint-disable no-console */
import { PrismaClient, Prisma } from '../generated/prisma';
import { hashPassword } from '../src/password';

const prisma = new PrismaClient();

/**
 * Seed data for local development.
 *
 * The admin user below is the ONE sanctioned way an `admin` row is created.
 * In every other path (signup, account, admin UI) users are `customer` only;
 * production admins are promoted by hand directly in the production database.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

async function main() {
  // 1. Store settings (single row, id = 1)
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: { currency: 'pkr', storeName: 'VIDNTEC' },
    create: {
      id: 1,
      storeName: 'VIDNTEC',
      currency: 'pkr',
      taxEnabled: true,
      taxRateBps: 875, // 8.75%
      taxLabel: 'Sales tax',
      supportEmail: 'support@vidntec.test',
    },
  });

  // 2. Sample admin (sanctioned exception). Re-seeding keeps the password in sync.
  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'admin', passwordHash: adminHash, emailVerifiedAt: new Date() },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`admin user: ${admin.email} (password: ${ADMIN_PASSWORD})`);

  // 3. A sample customer
  await prisma.user.upsert({
    where: { email: 'customer@vidntec.test' },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: 'customer@vidntec.test',
      passwordHash: await hashPassword('customer-password-123'),
      role: 'customer',
      emailVerifiedAt: new Date(),
    },
  });

  // 4. Shipping rates
  await prisma.shippingRate.deleteMany({});
  await prisma.shippingRate.createMany({
    data: [
      // prices are integer minor units (paisa) — Rs 599, free over Rs 7,500
      { name: 'Standard (3-5 days)', price: 59900, minOrderForFree: 750000 },
      { name: 'Express (1-2 days)', price: 149900, minOrderForFree: null },
    ],
  });

  // 5. Categories (optional on products; storefront "Shop by category")
  const categories: Array<{ name: string; slug: string; color: string; emoji: string }> = [
    { name: 'Desk Accessories', slug: 'desk-accessories', color: '#dce9e2', emoji: '🗄️' },
    { name: 'Planters & Pots', slug: 'planters-and-pots', color: '#e8e4d9', emoji: '🪴' },
    { name: 'Toys & Fidgets', slug: 'toys-and-fidgets', color: '#f4d7d8', emoji: '🐉' },
  ];
  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, color: c.color, emoji: c.emoji },
      create: { name: c.name, slug: c.slug, color: c.color, emoji: c.emoji, position: i },
    });
  }

  // 6. Sample products + variants + images
  const products: Array<{
    title: string;
    slug: string;
    description: string;
    featured?: boolean;
    categorySlug?: string;
    images: string[];
    variants: Prisma.VariantCreateWithoutProductInput[];
  }> = [
    {
      title: 'Hexagonal Desk Organizer',
      slug: 'hexagonal-desk-organizer',
      description: 'A modular 3D-printed desk organizer with a honeycomb footprint.',
      categorySlug: 'desk-accessories',
      images: [
        'https://images.unsplash.com/photo-1751107807635-a2ac6035e8dd?w=1200&q=70&auto=format&fit=crop',
      ],
      variants: [
        // prices are integer minor units (paisa). "Sand" is on sale (was Rs 2,599).
        { name: 'Matte Black', price: 199900, sku: 'ORG-HEX-BLK', stock: 25 },
        { name: 'Slate Grey', price: 199900, sku: 'ORG-HEX-GRY', stock: 18 },
        { name: 'Sand', price: 229900, compareAtPrice: 259900, sku: 'ORG-HEX-SND', stock: 12 },
      ],
    },
    {
      title: 'Articulated Desk Dragon',
      slug: 'articulated-desk-dragon',
      description: 'Fully articulated print-in-place dragon. No supports, all fidget.',
      featured: true,
      categorySlug: 'toys-and-fidgets',
      images: [
        'https://images.unsplash.com/photo-1627874458807-1ea486b9cbb2?w=1200&q=70&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1674053965701-bb1e48bed3de?w=1200&q=70&auto=format&fit=crop',
      ],
      variants: [
        // Rs 1,499 / Rs 2,999
        { name: 'Small (12cm)', price: 149900, sku: 'DRG-ART-SM', stock: 40 },
        { name: 'Large (24cm)', price: 299900, sku: 'DRG-ART-LG', stock: 15 },
      ],
    },
    {
      title: 'Low-Poly Planter',
      slug: 'low-poly-planter',
      description: 'Faceted self-watering planter for succulents and small herbs.',
      featured: true,
      categorySlug: 'planters-and-pots',
      images: [
        'https://images.unsplash.com/photo-1775736300402-320bc6f26845?w=1200&q=70&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1572198103081-3ec186228dd4?w=1200&q=70&auto=format&fit=crop',
      ],
      // Rs 1,199, on sale from Rs 1,499
      variants: [
        { name: 'Terracotta', price: 119900, compareAtPrice: 149900, sku: 'PLT-LP-TER', stock: 30 },
      ],
    },
  ];

  for (const p of products) {
    const category = p.categorySlug ? { connect: { slug: p.categorySlug } } : undefined;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...(category ? { category } : {}) },
      create: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        status: 'active',
        featured: p.featured ?? false,
        ...(category ? { category } : {}),
        images: {
          create: p.images.map((url, i) => ({ url, position: i })),
        },
        variants: { create: p.variants },
      },
    });
  }

  console.log(`seeded ${products.length} products`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
