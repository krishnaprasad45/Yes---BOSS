-- AlterTable
ALTER TABLE "AutoReplyConfig" ADD COLUMN     "recapEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recapNumber" TEXT NOT NULL DEFAULT '';
