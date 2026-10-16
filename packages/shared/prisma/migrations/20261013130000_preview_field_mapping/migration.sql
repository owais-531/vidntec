-- Which personalization fields feed the AI preview. Additive + a backfill.

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "previewNameFieldId" TEXT,
  ADD COLUMN "previewInitialFieldId" TEXT,
  ADD COLUMN "previewColourFieldId" TEXT;

-- Backfill: a product with the preview on used "the name" — now its first text field
UPDATE "products" p
SET "previewNameFieldId" = (
  SELECT f->>'id'
  FROM jsonb_array_elements(p."personalizationFields") AS f
  WHERE f->>'type' = 'text'
  LIMIT 1
)
WHERE p."previewEnabled";
