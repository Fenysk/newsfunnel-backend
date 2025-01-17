/*
  Warnings:

  - The primary key for the `MailServer` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "MailServer" DROP CONSTRAINT "MailServer_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MailServer_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MailServer_id_seq";

-- CreateTable
CREATE TABLE "Mail" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mailServerId" TEXT NOT NULL,

    CONSTRAINT "Mail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_mailServerId_fkey" FOREIGN KEY ("mailServerId") REFERENCES "MailServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
