-- CreateTable
CREATE TABLE "VaultAccess" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultAccess_userId_createdAt_idx" ON "VaultAccess"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "VaultAccess" ADD CONSTRAINT "VaultAccess_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccess" ADD CONSTRAINT "VaultAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
