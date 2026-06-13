-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "contactName" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordingUrl" TEXT,
    "sourceFileName" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTxn" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "merchant" TEXT,
    "source" TEXT,
    "category" TEXT,
    "rawBody" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Call_occurredAt_idx" ON "Call"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call_phoneNumber_occurredAt_key" ON "Call"("phoneNumber", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTxn_dedupeKey_key" ON "SmsTxn"("dedupeKey");

-- CreateIndex
CREATE INDEX "SmsTxn_receivedAt_idx" ON "SmsTxn"("receivedAt");

-- CreateIndex
CREATE INDEX "SmsTxn_type_idx" ON "SmsTxn"("type");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
