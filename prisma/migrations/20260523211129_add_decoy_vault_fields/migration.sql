-- DropIndex
DROP INDEX "VaultEntry_vaultId_deletedAt_idx";

-- AlterTable
ALTER TABLE "Vault" ADD COLUMN     "decoySalt" TEXT;

-- AlterTable
ALTER TABLE "VaultEntry" ADD COLUMN     "isDecoy" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "VaultEntry_vaultId_isDecoy_deletedAt_idx" ON "VaultEntry"("vaultId", "isDecoy", "deletedAt");
