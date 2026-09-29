-- AlterTable (additive, defaulted, no backfill — existing categories default to
-- not featured, homepage renders exactly as before)
ALTER TABLE "categories" ADD COLUMN "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;
