-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "ReceivingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "locationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" DATETIME
);

-- CreateTable
CREATE TABLE "UnmatchedScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScannedAt" DATETIME NOT NULL,
    CONSTRAINT "UnmatchedScan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReceivingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivingLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" TEXT,
    "originalPrice" TEXT NOT NULL,
    "currentPrice" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReceivingLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReceivingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReceivingSession_shop_status_idx" ON "ReceivingSession"("shop", "status");

-- CreateIndex
CREATE INDEX "UnmatchedScan_sessionId_idx" ON "UnmatchedScan"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedScan_sessionId_barcode_key" ON "UnmatchedScan"("sessionId", "barcode");

-- CreateIndex
CREATE INDEX "ReceivingLine_sessionId_idx" ON "ReceivingLine"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingLine_sessionId_variantId_key" ON "ReceivingLine"("sessionId", "variantId");
