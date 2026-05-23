-- AlterTable
ALTER TABLE "VaultEntry" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VaultEntry_vaultId_deletedAt_idx" ON "VaultEntry"("vaultId", "deletedAt");
