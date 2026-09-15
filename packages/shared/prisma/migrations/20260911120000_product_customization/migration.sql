-- AlterTable (additive, defaulted, no backfill — existing products keep customization off)
ALTER TABLE "products" ADD COLUMN "customizationNameEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "customizationColorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "customizationColorOptions" JSONB NOT NULL DEFAULT '[]';

-- AlterTable (additive, nullable — existing cart lines have no personalization)
ALTER TABLE "cart_items" ADD COLUMN "customName" TEXT;
ALTER TABLE "cart_items" ADD COLUMN "customColorLabel" TEXT;
ALTER TABLE "cart_items" ADD COLUMN "customColorHex" TEXT;

-- DropIndex (a variant can now appear as more than one cart line when
-- personalization differs, so it can no longer be the cart's unique key)
DROP INDEX "cart_items_cartId_variantId_key";

-- DropIndex (superseded by the composite index below)
DROP INDEX "cart_items_cartId_idx";

-- CreateIndex
CREATE INDEX "cart_items_cartId_variantId_idx" ON "cart_items"("cartId", "variantId");

-- AlterTable (additive, nullable — historical orders have no personalization)
ALTER TABLE "order_items" ADD COLUMN "customNameSnapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN "customColorLabelSnapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN "customColorHexSnapshot" TEXT;
