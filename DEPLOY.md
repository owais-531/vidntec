# vidntec — deployment runbook

Web → **Vercel**, API + database → **Railway** (Postgres runs as a service in the
same Railway project as the API). Do the steps in order; each one has a check.

---

## 0. Accounts & CLIs

- [ ] Vercel, Railway, Stripe, Cloudinary, Resend, Sentry accounts
- [ ] `npm i -g vercel` (optional), Railway CLI (optional), Stripe CLI
- [ ] The GitHub repo is pushed and CI is green

---

## 1. Database (Railway Postgres)

1. In your Railway project (create it now if step 3 hasn't been done yet):
   **New → Database → Add PostgreSQL**.
2. Open the Postgres service's **Variables** tab and copy the **`DATABASE_PUBLIC_URL`**
   (the public/proxy connection string — needed to run commands from your own
   machine; the plain `DATABASE_URL` is Railway's *internal* address, only
   reachable from other services inside the same Railway project).
3. Run the migrations from your machine against the new DB:
   ```bash
   DATABASE_URL="<DATABASE_PUBLIC_URL>" \
     pnpm --filter @vidntec/shared exec prisma migrate deploy
   ```
4. Seed **once** (creates the sample admin + products + shipping rates + settings):
   ```bash
   DATABASE_URL="<DATABASE_PUBLIC_URL>" \
   SEED_ADMIN_EMAIL="you@yourdomain.com" SEED_ADMIN_PASSWORD="<a strong password>" \
     pnpm --filter @vidntec/shared db:seed
   ```
   > ✅ Check: `prisma migrate status` shows all migrations applied.

   In step 3 below, the **API service's** `DATABASE_URL` variable should instead
   be a **reference variable** pointing at `${{Postgres.DATABASE_URL}}` (the
   internal address) — faster and doesn't leave the Railway network.

---

## 2. Secrets to generate now

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET  (must differ)
```

Collect the rest:
- **Stripe** (test mode first): `STRIPE_SECRET_KEY` = `sk_test_…`
- **Cloudinary**: cloud name, API key, API secret
- **Resend**: `re_…` API key; verify your sending domain, set `EMAIL_FROM` to
  `vidntec <orders@yourdomain.com>`
- **Sentry**: a DSN for the API project and one for the web project;
  `SENTRY_ORG`, `SENTRY_PROJECT` (web), and a `SENTRY_AUTH_TOKEN` for source-map upload

---

## 3. API → Railway

1. **New Project → Deploy from GitHub repo** → pick this repo.
2. Service settings:
   - **Root Directory**: `/` (repo root — the Docker build needs `packages/shared`)
   - **Builder**: Dockerfile — path `apps/api/Dockerfile` (already in `apps/api/railway.json`)
3. **Variables** (Settings → Variables) — add all of these:

   | Var | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | reference variable: `${{Postgres.DATABASE_URL}}` |
   | `JWT_ACCESS_SECRET` | generated |
   | `JWT_REFRESH_SECRET` | generated (different) |
   | `WEB_ORIGIN` | `https://<your-web-domain>` (set after step 4, then redeploy) |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAMESITE` | `none` |
   | `AUTH_COOKIE_DOMAIN` | `.yourdomain.com` *(only if web & api share a parent domain — see step 5)* |
   | `STRIPE_SECRET_KEY` | `sk_test_…` |
   | `STRIPE_WEBHOOK_SECRET` | set after step 6 |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from Cloudinary |
   | `RESEND_API_KEY` | `re_…` |
   | `EMAIL_FROM` | `vidntec <orders@yourdomain.com>` |
   | `SENTRY_DSN` | API project DSN |
   | `SENTRY_ENVIRONMENT` | `production` |

4. Deploy. The container runs `prisma migrate deploy` then `node dist/main.js`.
   > ✅ Check: `GET https://<railway-domain>/health` → `{"status":"ok","db":true}`

---

## 4. Web → Vercel

1. **Add New → Project** → import this repo.
2. **Root Directory**: `apps/web`. Framework preset: Next.js.
   (Install/build commands come from `vercel.json` — they `cd ../..` and run the
   Turbo filter so `packages/shared` builds first.)
3. **Environment Variables**:

   | Var | Value |
   |---|---|
   | `API_URL` | `https://<railway-domain>` |
   | `NEXT_PUBLIC_API_URL` | `https://<railway-domain>` (or your API custom domain) |
   | `NEXT_PUBLIC_SITE_URL` | `https://vidntec.com` — canonical URL for SEO (metadataBase, canonical tags, sitemap, robots, JSON-LD). No trailing slash. |
   | `JWT_ACCESS_SECRET` | **same value** as the API's — the web only verifies tokens |
   | `NEXT_PUBLIC_SENTRY_DSN` | web project DSN |
   | `SENTRY_ENVIRONMENT` | `production` |
   | `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | for source-map upload |

4. Deploy. Then go back to **Railway → `WEB_ORIGIN`** and set it to the Vercel
   URL; redeploy the API.
   > ✅ Check: the storefront loads, `/products` shows the seeded products.

---

## 5. Cookies across two domains

Auth cookies are `httpOnly; Secure; SameSite=None`. For the browser to send them
to the API you need **one** of:

- **Best:** put both apps on subdomains of one root (`shop.yourdomain.com` +
  `api.yourdomain.com`), set `AUTH_COOKIE_DOMAIN=.yourdomain.com` on the API.
- **Works without a shared domain:** leave `AUTH_COOKIE_DOMAIN` unset. Login and
  all data fetching still work because the web calls the API server-side and
  relays the cookies on its own origin — only direct browser→API calls would be
  affected, and there are none in this app.

> ✅ Check: sign in to `/login`, land on `/admin/products` (as the seeded admin),
> refresh — you stay signed in.

---

## 6. Stripe webhook

1. **Dashboard → Developers → Webhooks → Add endpoint**
   - URL: `https://<railway-domain>/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
2. Copy the endpoint's **Signing secret** (`whsec_…`) → Railway
   `STRIPE_WEBHOOK_SECRET`, redeploy the API.
3. Place a real test order in the storefront with card `4242 4242 4242 4242`.
   > ✅ Check: the webhook shows `200` in the Stripe dashboard; the order appears
   > in `/admin/orders` as `paid`; stock decremented; confirmation email received.

When ready for real money: swap `STRIPE_SECRET_KEY` to the live key, create a
**live-mode** webhook endpoint, and update `STRIPE_WEBHOOK_SECRET`.

---

## 7. Admin & content

- [ ] Sign in as the seeded admin; **change the password** (via forgot-password
      flow) or set a new hash directly in the Railway Postgres data tab/query console.
- [ ] Grant any additional admins by setting their `role` column to `admin` in
      the Railway Postgres query console — there is deliberately no UI for this.
- [ ] Delete the sample products; add real ones with real Cloudinary images.
- [ ] `/admin/shipping` — set your real rates. `/admin/settings` — tax rate,
      currency, store name, support email.

---

## 8. Monitoring check

- Trigger an error on purpose (e.g. hit a non-existent admin route while signed
  in, or temporarily throw in a page) and confirm it lands in **both** Sentry
  projects.
- Remove the deliberate error.

---

## Rollback

- **Web**: Vercel → Deployments → promote a previous deployment.
- **API**: Railway → Deployments → redeploy a previous build. Migrations are
  forward-only — a schema rollback needs a manual `prisma migrate resolve` +
  down SQL, so prefer rolling forward.
