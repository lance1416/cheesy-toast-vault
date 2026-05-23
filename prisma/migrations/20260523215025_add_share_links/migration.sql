-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedBlob" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'login',
    "label" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "maxViews" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLink_userId_idx" ON "ShareLink"("userId");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
