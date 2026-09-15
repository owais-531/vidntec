-- AlterTable (additive, nullable — existing images stay unassigned to any variant)
ALTER TABLE "product_images" ADD COLUMN "variantId" TEXT;

-- CreateIndex
CREATE INDEX "product_images_variantId_idx" ON "product_images"("variantId");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
