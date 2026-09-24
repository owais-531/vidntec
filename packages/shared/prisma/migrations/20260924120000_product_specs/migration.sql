-- AlterTable (additive, defaulted, no backfill — existing products get an empty
-- details table and render exactly as before)
ALTER TABLE "products" ADD COLUMN "specs" JSONB NOT NULL DEFAULT '[]';
