-- CreateTable
CREATE TABLE "CustomEntryType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomEntryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomEntryType_userId_idx" ON "CustomEntryType"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomEntryType_userId_name_key" ON "CustomEntryType"("userId", "name");

-- AddForeignKey
ALTER TABLE "CustomEntryType" ADD CONSTRAINT "CustomEntryType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
