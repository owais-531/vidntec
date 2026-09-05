# Build context MUST be the repo root (see railway.json / railway.toml).
# docker build -f apps/api/Dockerfile .

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── deps: install with the full lockfile so the workspace graph resolves ──────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shared/prisma packages/shared/prisma
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── build: shared (prisma generate + tsc) then the API ───────────────────────
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm turbo run build --filter=@vidntec/api...

# ── runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations, then start the persistent server.
CMD ["sh", "-c", "pnpm --filter @vidntec/shared exec prisma migrate deploy && node dist/main.js"]
