-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedJob_seekerId_createdAt_idx" ON "SavedJob"("seekerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_seekerId_jobId_key" ON "SavedJob"("seekerId", "jobId");

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
