/*
  Warnings:

  - Added the required column `isNewsletter` to the `MailMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MailMetadata" ADD COLUMN     "isNewsletter" BOOLEAN NOT NULL;
