/*
  Warnings:

  - Added the required column `longResume` to the `MailMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MailMetadata" ADD COLUMN     "longResume" TEXT NOT NULL;
