-- CreateEnum
CREATE TYPE "PendingCheckoutStatus" AS ENUM ('open', 'consumed', 'expired');

-- CreateTable
CREATE TABLE "pending_checkouts" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "shippingRateId" TEXT,
    "cartId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "subtotal" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "lineItems" JSONB NOT NULL,
    "status" "PendingCheckoutStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_checkouts_stripeSessionId_key" ON "pending_checkouts"("stripeSessionId");

-- CreateIndex
CREATE INDEX "pending_checkouts_status_idx" ON "pending_checkouts"("status");
