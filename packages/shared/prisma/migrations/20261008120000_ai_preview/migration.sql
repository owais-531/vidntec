-- AlterTable
ALTER TABLE "products" ADD COLUMN     "previewEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previewLimit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "previewPrompt" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "colorHex" TEXT;

-- CreateTable
CREATE TABLE "preview_references" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "letters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "preview_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preview_generations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preview_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preview_references_productId_idx" ON "preview_references"("productId");

-- CreateIndex
CREATE INDEX "preview_generations_productId_visitorKey_createdAt_idx" ON "preview_generations"("productId", "visitorKey", "createdAt");

-- CreateIndex
CREATE INDEX "preview_generations_createdAt_idx" ON "preview_generations"("createdAt");

-- AddForeignKey
ALTER TABLE "preview_references" ADD CONSTRAINT "preview_references_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preview_generations" ADD CONSTRAINT "preview_generations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

