-- AlterTable
ALTER TABLE "products" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "compareAtPrice" INTEGER;

-- CreateIndex
CREATE INDEX "products_featured_idx" ON "products"("featured");
