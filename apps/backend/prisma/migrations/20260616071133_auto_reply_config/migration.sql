-- CreateTable
CREATE TABLE "AutoReplyConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT 'Sorry, I missed your call. I''ll get back to you shortly.',
    "signature" TEXT NOT NULL DEFAULT '— AI Assistant',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoReplyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoReplyConfig_userId_key" ON "AutoReplyConfig"("userId");
