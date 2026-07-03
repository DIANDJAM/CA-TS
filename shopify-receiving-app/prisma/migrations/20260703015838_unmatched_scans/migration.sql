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

-- CreateIndex
CREATE INDEX "UnmatchedScan_sessionId_idx" ON "UnmatchedScan"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedScan_sessionId_barcode_key" ON "UnmatchedScan"("sessionId", "barcode");
