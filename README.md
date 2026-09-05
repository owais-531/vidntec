# vidntec

Custom e-commerce store for 3D-printed physical products — customer storefront + admin portal.

- **Fixed catalog**, set prices. No file-upload / quote configurator.
- Payments: **Stripe Checkout** and **Cash on Delivery**.
- Guest checkout allowed.

## Stack

| Part | Tech |
|------|------|
| Monorepo | pnpm workspaces + Turborepo |
| `apps/web` | Next.js (App Router), TypeScript, Tailwind CSS → **Vercel** |
| `apps/api` | NestJS, TypeScript → **Railway** |
| `packages/shared` | Shared TS types, Zod schemas, Prisma schema + generated client |
| Database | PostgreSQL (Railway) via Prisma |
| Auth | Hand-rolled JWT, argon2, access+refresh cookies, refresh rotation |
| Payments | Stripe + Cash on Delivery |
| Images | Cloudinary |
| Email | Resend |
| Monitoring | Sentry (both apps) |

## Repo layout

```
apps/
  web/     Next.js storefront + admin (protected /admin routes)
  api/     NestJS REST API, Stripe webhook, persistent server
packages/
  shared/  @vidntec/shared  — contracts (Zod), money helpers, constants
           @vidntec/shared/prisma  — generated Prisma client + model types
           prisma/  — schema.prisma, migrations, seed.ts
```

## Prerequisites

- Node 20.11+ (`nvm use`)
- pnpm 9 (`corepack enable`)
- Docker (for local Postgres — see `docker compose up -d db` below; production uses Railway Postgres)
- Stripe, Cloudinary, Resend accounts (test keys are fine for dev)
- Stripe CLI (for local webhook testing)

## Setup

```bash
corepack enable
pnpm install            # also runs `prisma generate` into packages/shared/generated

# ── env: two files for local dev ─────────────────────────────────────────────
cp .env.example .env               # API + Prisma CLI (root)
cp apps/web/.env.example apps/web/.env.local   # Next.js

# generate JWT secrets (put ACCESS + REFRESH in .env; ACCESS also in apps/web/.env.local)
openssl rand -base64 48   # -> JWT_ACCESS_SECRET   (same value in .env AND apps/web/.env.local)
openssl rand -base64 48   # -> JWT_REFRESH_SECRET  (API only; must differ)

# ── database (Docker) ───────────────────────────────────────────────────────
docker compose up -d db
pnpm db:migrate         # apply migrations
pnpm db:seed            # sample admin + customer + products + shipping rates
```

`apps/api/.env.example` lists every API variable (for Railway); locally the root
`.env` covers them. `JWT_ACCESS_SECRET` must be **identical** in `.env` and
`apps/web/.env.local` — the web verifies tokens, the API signs them.

Seed creates an admin: `admin@gmail.com` / `admin123`
(override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; use a strong password in production).

## Run

```bash
pnpm dev                # web on :3000, api on :4000, shared in watch mode
```

Individually:

```bash
pnpm --filter @vidntec/api dev
pnpm --filter @vidntec/web dev
```

## Common scripts (run from repo root)

| Command | Does |
|---------|------|
| `pnpm build` | Build everything (Turbo builds `shared` first) |
| `pnpm build:web` / `pnpm build:api` | Build one app + its deps |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Across the workspace |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:deploy` | `prisma migrate deploy` (prod) |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Drop + re-migrate + seed |

## Roles / admin access

Every signup is `role = 'customer'` — enforced server-side **and** as the DB
column default. The signup endpoint ignores any `role` in the request. There is
**no UI or API anywhere** to create or promote an admin.

To grant admin: update the user's `role` column to `admin` directly in the
production database (Railway Postgres console). (The seed script's sample
admin is the only code path that inserts an admin row.)

## Auth model

- argon2id password hashes (never plaintext, never reversible) — shared params in
  `@vidntec/shared/password`, used by the API and the seed script.
- **Access token** = short-lived HS256 JWT (`vidntec_at`, 15 min).
  **Refresh token** = opaque 48-byte random string, stored only as a SHA-256 hash
  (`vidntec_rt`, 30 days). Both `httpOnly` cookies.
- **Refresh-token rotation**: `POST /auth/refresh` consumes the presented token,
  issues a new pair, and marks the old one `revoked` with `replacedById` set.
  Presenting an already-revoked token = reuse detection → the user's whole token
  family is revoked.
- Password reset: `POST /auth/forgot-password` (no account enumeration — always
  200) emails a single-use token (`password_reset_tokens`, 1 h); `POST
  /auth/reset-password` sets the new hash and revokes all sessions.
- NestJS `AdminGuard` re-verifies the token and `role === 'admin'` on every admin
  endpoint — **the** security boundary. `OptionalAuthGuard` powers guest-allowed
  routes (cart/checkout).
- Next.js middleware guards `/admin`: verifies the access token with `jose`,
  silently calls `/auth/refresh` when it's expired, redirects to `/login`
  otherwise. Server components use `requireAdmin()` / `requireUser()` from
  `src/lib/auth.ts`.

### Auth endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | always `role=customer`; any `role` in the body is ignored |
| POST | `/auth/login` | throttled 10/min; constant-time-ish for unknown emails |
| POST | `/auth/refresh` | rotates tokens |
| POST | `/auth/logout` | revokes the refresh token, clears cookies |
| GET | `/auth/me` | requires access token |
| POST | `/auth/forgot-password` | throttled 5/min, always 200 |
| POST | `/auth/reset-password` | single-use token, revokes all sessions |

Local password-reset testing: the reset link is written to the API log
(`MailService` is a logging stub until Resend is wired in M7).

## Admin portal (M3)

Route: `/admin/*` — Next.js middleware gate + `requireAdmin()` in the layout;
the NestJS `AdminGuard` is the real boundary on every `/admin/**` API route.

- **Sign in** at `/login` — a server action sets the httpOnly cookies on the web
  origin, so browser→API calls never need `SameSite=None` locally.
- `/admin/products` — searchable / status-filtered / paginated list.
- `/admin/products/new` — create (title, slug auto-generated from title if blank,
  description, status, ≥1 variant).
- `/admin/products/[id]` — edit fields; inline variant editor (price / stock /
  SKU, add / remove, last variant protected); image manager (direct
  browser→Cloudinary signed upload, reorder, delete; first image = thumbnail);
  delete product.
- `/admin/inventory` — every variant with −/+ steppers, a "set" box, and a
  low-stock flag (≤ `LOW_STOCK_THRESHOLD`).
- `/admin/orders`, `/admin/shipping`, `/admin/settings` — placeholders (M7 / M8).

Admin API routes (all `AdminGuard`-protected):

| Method | Path |
|---|---|
| GET / POST | `/admin/products` |
| GET / PATCH / DELETE | `/admin/products/:id` |
| POST | `/admin/products/:id/variants` |
| PATCH / DELETE | `/admin/variants/:id` |
| POST | `/admin/variants/:id/stock` (`{mode:'delta'\|'set', value}`) |
| POST / PATCH / DELETE | `/admin/products/:id/images[...]` |
| GET | `/admin/inventory` |
| POST | `/admin/uploads/signature` |

**Design**: derived from the storefront screenshots — red `#e92c46` primary,
light-grey page, white cards, Poppins. Tokens in `apps/web/tailwind.config.ts`.

**Cloudinary**: `CLOUDINARY_*` must be real for image upload. The API mints a
signed payload; the browser uploads straight to Cloudinary; only `secure_url` +
`public_id` are stored.

**Admin token refresh**: the Next middleware is the **single** refresh point for
`/admin` — on an expired access token it rotates via `/auth/refresh` and forwards
the new cookies to both the render and the browser, so `apiFetch` never races it
(which would trip refresh-token reuse detection).

## Storefront (M4)

Public, unauthenticated. Route group `src/app/(store)/` with its own header/footer.

- `GET /products` (API) — `status: 'active'` only; `q`, `sort` (`newest` |
  `price-asc` | `price-desc` | `title`), `page`, `pageSize` (≤ 48). Draft
  products never appear in the list or at `/products/:slug` (404).
- `/` — hero + "Latest products" grid.
- `/products` — full catalog grid, search (`?q=`), sort, pagination.
- `/products/[slug]` — gallery + variant picker (price/stock per variant) +
  description + live "Add to cart".
- `/cart` — line items, quantity steppers, subtotal, "Proceed to checkout".

Same design tokens as the admin (red/grey/white, Poppins). Storefront reads are
`no-store` for now; revisit caching in M8.

## Cart (M5)

Server-authoritative — `unitPrice` / `lineTotal` / `subtotal` are always
recomputed from the current variant price; the client never sends prices.

- Guests get a `vidntec_cart` httpOnly cookie holding the `Cart` id. On login the
  web calls `POST /cart/merge`, which folds the guest cart into the user's cart
  (summing shared variants, capped at `MAX_CART_ITEM_QUANTITY`) and deletes the
  guest cart.
- `GET /cart` is side-effect-light: a brand-new guest (no cookie, no session)
  gets an empty view with no row created, so a Server Component render never
  leaks carts.
- Add / update / remove clamp quantity to `min(requested, variant.stock,
  MAX_CART_ITEM_QUANTITY)`; adding an out-of-stock variant → 409.
- The cart view prunes lines whose product was unpublished or deleted and
  reports `removedCount`; `exceedsStock` flags lines whose quantity now exceeds
  stock (hard-enforced at checkout in M6).

| Method | Path |
|---|---|
| GET | `/cart` |
| POST | `/cart/merge` |
| POST | `/cart/items` `{variantId, quantity}` |
| PATCH | `/cart/items/:variantId` `{quantity}` (0 removes) |
| DELETE | `/cart/items/:variantId` |

Storefront: PDP "Add to cart" is live (variant + quantity), header shows a live
count badge, `/cart` has quantity steppers / remove / subtotal.

## Checkout + payments (M6)

Totals are recomputed server-side from current variant prices, the chosen
shipping rate, and the tax rate:

```
subtotal = Σ (current variant price × qty)
shipping = rate.price   (0 when subtotal ≥ rate.minOrderForFree)
tax      = round(subtotal × StoreSettings.taxRateBps / 10000)   when taxEnabled
total    = subtotal + shipping + tax
```

`taxForSubtotal()` in `@vidntec/shared` is the single seam — swap it for Stripe
Tax later without touching callers.

| Method | Path | |
|---|---|---|
| GET | `/shipping/rates` | active rates (public) |
| POST | `/checkout/quote` `{shippingRateId}` | server-computed `Quote` preview |
| POST | `/checkout` | `{email, shippingAddress, shippingRateId, paymentMethod}` → `{paymentMethod:'stripe', checkoutUrl}` or `{paymentMethod:'cod', orderId}` |
| GET | `/checkout/session/:id` | poll a Stripe session on the success page |
| POST | `/webhooks/stripe` | Stripe events (raw body, `@SkipThrottle`) |

**COD** — one request: transaction decrements each variant's stock with a
`stock >= qty` guard (rolls back → 409 if any line can't be satisfied), creates
the `Order` (`pending` / `cod`) + `OrderItems` (title/price snapshots), clears
the cart. Confirmation email (stub until M7).

**Stripe** — `POST /checkout` re-prices + validates stock, creates a Stripe
Checkout Session, and writes a `PendingCheckout` snapshot (line items + amounts +
address, keyed by session id). **No Order yet.** The customer pays on Stripe;
`checkout.session.completed` fires →

1. verify signature (raw body)
2. `processed_stripe_events` idempotency check (fast path + inside the txn)
3. `PendingCheckout` looked up by session id; skip if already consumed or an
   Order for the session exists
4. single transaction: decrement stock (clamped to available, oversell logged +
   sent to Sentry), create `Order` (`paid` / `stripe`, `stripePaymentIntentId`) +
   `OrderItems` from the snapshot, mark the `PendingCheckout` consumed, clear the
   cart, record the event

`/checkout/success?session_id=…` polls `/checkout/session/:id` and self-refreshes
while the webhook is still in flight.

### Local Stripe testing

```bash
# put real test keys in the repo-root .env:
#   STRIPE_SECRET_KEY=sk_test_...
stripe login
stripe listen --forward-to localhost:4000/webhooks/stripe
#   -> copy the printed whsec_... into .env as STRIPE_WEBHOOK_SECRET, restart the API

# place a card order in the UI (test card 4242 4242 4242 4242), or:
stripe trigger checkout.session.completed
```

## Orders + email (M7)

### Customer

| Method | Path | |
|---|---|---|
| GET | `/orders/:id` | guest: `?email=` must match a **guest** order; registered-user orders require signing in as the owner. Every failure returns 404 (ids can't be probed) |
| GET | `/account/orders` | the signed-in user's orders |

Storefront: `/orders/[id]` status page (linked from the checkout success page),
`/account/orders` list, header shows "Orders" when signed in.

### Admin

| Method | Path | Transition |
|---|---|---|
| GET | `/admin/orders` | list, `?status=` filter, paginated |
| GET | `/admin/orders/:id` | full detail |
| POST | `/admin/orders/:id/mark-paid` | COD `pending → paid` |
| POST | `/admin/orders/:id/fulfill` | `paid → fulfilled` + tracking + **shipping email** |
| POST | `/admin/orders/:id/cancel` | COD `pending → cancelled` + restock |
| POST | `/admin/orders/:id/refund` | Stripe `paid`/`fulfilled` → `refunded` (Stripe refund API; restocks only if not yet shipped) |

Invalid transitions return 409 with a readable message. `/admin/orders` +
`/admin/orders/[id]` (with contextual action buttons) replace the M3 placeholder.

### Email (Resend)

`MailService` sends via Resend when `RESEND_API_KEY` looks real (`re_` + a long
token); otherwise every message is **logged, not sent** — local dev needs no key.
Templates live in `apps/api/src/mail/templates.ts`.

- **Order confirmation** — COD placed / Stripe webhook confirmed
- **Shipping notification** — admin marks an order fulfilled with a tracking number
- **Password reset** — the M2 flow (was a log stub, now a real email)

Email failures are logged + sent to Sentry but never roll back an order.

## Admin: shipping & settings (M8)

- **`/admin/shipping`** — CRUD flat rates (name, price, "free over" threshold,
  activate/deactivate). `GET /admin/shipping/rates` · `POST` · `PATCH :id` ·
  `DELETE :id`. Inactive rates are hidden from checkout.
- **`/admin/settings`** — writes `StoreSettings`: store name, support email,
  currency, tax on/off, tax label, tax rate %. `GET`/`PATCH /admin/settings`.
- Orders now snapshot `currency` at creation, so changing the store currency
  later doesn't misrender past orders.

## Storefront caching (M8)

Public catalog reads (`/products`, `/products/:slug`) go through Next's Data
Cache — `revalidate: 60` under the `products` tag. Every admin catalog mutation
(product / variant / image / settings) calls `revalidateTag('products')`, so
edits show on the storefront immediately. Cart, checkout, and order pages are
never cached.

## Security

- API: `helmet`, CORS locked to `WEB_ORIGIN` with credentials, per-route
  throttling on auth (10/min) and checkout (10/min), global 120/min.
- Web: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy` on every route; `poweredByHeader` off.
- Auth cookies `httpOnly`; the JWT access secret is shared with the web for
  verification only. Signed-in user attached to the Sentry scope in the guards.

## Deployment

### Web → Vercel
- **Root Directory**: `apps/web`
- Install: `cd ../.. && pnpm install --frozen-lockfile`
- Build: `cd ../.. && pnpm turbo run build --filter=@vidntec/web...`
- (both are set in `vercel.json`)
- Env vars: `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`,
  `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

### API → Railway
- **Root Directory**: repo root (so the Docker build sees `packages/shared`)
- Builder: Dockerfile at `apps/api/Dockerfile` (see `apps/api/railway.json`)
- Container runs `prisma migrate deploy` then `node dist/main.js`
- Env vars: everything in `apps/api/.env.example`
  (`DATABASE_URL` = Railway Postgres reference variable, `${{Postgres.DATABASE_URL}}`)
- Health check: `GET /health`

### Cross-domain cookies
Web (Vercel) and API (Railway) are different domains, so auth cookies are set
`SameSite=None; Secure`. In production, point `AUTH_COOKIE_DOMAIN` at a shared
parent domain (e.g. `.vidntec.com`) and put both apps on subdomains, or accept
third-party-cookie constraints. CORS on the API allows only `WEB_ORIGIN` with
credentials.

## Milestones

- **M1** foundations + deploy config ✅
- **M2** auth (JWT + refresh rotation + admin gate) ✅
- **M3** admin products / variants / images ✅
- **M4** storefront browse ✅
- **M5** cart ✅
- **M6** checkout + Stripe webhook + COD ✅
- **M7** orders (customer + admin) + emails ✅
- **M8** polish / go-live (shipping rates, tax, Sentry, caching, README) ✅

**All milestones complete.** See [`DEPLOY.md`](./DEPLOY.md) for the go-live runbook.
