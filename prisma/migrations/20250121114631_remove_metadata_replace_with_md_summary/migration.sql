/*
  Warnings:

  - You are about to drop the `MailMetadata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MailMetadata" DROP CONSTRAINT "MailMetadata_mailId_fkey";

-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "markdownSummary" TEXT;

-- DropTable
DROP TABLE "MailMetadata";
