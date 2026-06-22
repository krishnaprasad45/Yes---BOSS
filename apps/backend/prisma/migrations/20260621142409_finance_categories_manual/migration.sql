-- AlterTable
ALTER TABLE "SmsTxn" ADD COLUMN     "entryMode" TEXT NOT NULL DEFAULT 'sms',
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2DD4BF',
    "dailyBudgetMinor" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyBudgetMinor" INTEGER NOT NULL DEFAULT 500000,
    "manualEntryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceConfig_userId_key" ON "FinanceConfig"("userId");

-- CreateIndex
CREATE INDEX "SmsTxn_entryMode_idx" ON "SmsTxn"("entryMode");
