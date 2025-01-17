-- CreateTable
CREATE TABLE "MailMetadata" (
    "id" TEXT NOT NULL,
    "newsletterName" TEXT,
    "theme" TEXT[],
    "tags" TEXT[],
    "mainSubjectsTitle" TEXT[],
    "oneResumeSentence" TEXT NOT NULL,
    "differentSubject" BOOLEAN NOT NULL,
    "isExplicitSponsored" BOOLEAN NOT NULL,
    "sponsorIfTrue" TEXT,
    "unsubscribeLink" TEXT,
    "priority" INTEGER NOT NULL,
    "mailId" TEXT NOT NULL,

    CONSTRAINT "MailMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailMetadata_mailId_key" ON "MailMetadata"("mailId");

-- AddForeignKey
ALTER TABLE "MailMetadata" ADD CONSTRAINT "MailMetadata_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
