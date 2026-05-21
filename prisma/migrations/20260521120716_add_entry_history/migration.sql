-- CreateTable
CREATE TABLE "EntryHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "encryptedBlob" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryHistory_entryId_idx" ON "EntryHistory"("entryId");

-- AddForeignKey
ALTER TABLE "EntryHistory" ADD CONSTRAINT "EntryHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
