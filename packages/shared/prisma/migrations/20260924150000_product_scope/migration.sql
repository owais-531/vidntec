-- AlterTable (additive, defaulted — existing products get an empty scope, and
-- the storefront hides the section when it's empty)
ALTER TABLE "products" ADD COLUMN "scope" TEXT NOT NULL DEFAULT '';
