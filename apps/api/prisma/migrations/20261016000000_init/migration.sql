-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BACKER', 'CREATOR', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED_FOR_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'AVAILABLE_FOR_FUNDING',
    'FUNDING_GOAL_REACHED',
    'FUNDING_PERIOD_ENDED',
    'DISTRIBUTION_PREPARATION',
    'PROMOTING',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'REFUND_PENDING',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PROJECTED', 'IN_PROGRESS', 'FINAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BACKER',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "narrative" TEXT,
    "category" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "raisedAmount" INTEGER NOT NULL DEFAULT 0,
    "backerCount" INTEGER NOT NULL DEFAULT 0,
    "reachMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 27.0,
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "deliveredReach" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 92,
    "trustCategory" TEXT NOT NULL DEFAULT 'Universal Trust Standard',
    "status" "CampaignStatus" NOT NULL DEFAULT 'AVAILABLE_FOR_FUNDING',
    "targetAudience" TEXT NOT NULL,
    "targetLocations" TEXT[],
    "audienceInterests" TEXT[],
    "distributionChannels" TEXT[],
    "imageUrl" TEXT NOT NULL,
    "adHeadline" TEXT,
    "adDescription" TEXT,
    "ctaText" TEXT DEFAULT 'Amplify This Message',
    "creatorName" TEXT NOT NULL,
    "creatorId" TEXT,
    "daysLeft" INTEGER NOT NULL DEFAULT 30,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "deadline" TIMESTAMP(3),
    "submissionTimestamp" TIMESTAMP(3),
    "approvalTimestamp" TIMESTAMP(3),
    "publishedTimestamp" TIMESTAMP(3),
    "completedTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "anonymousToken" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL DEFAULT 'Untitled Campaign',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draftData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStorySection" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageCaption" TEXT,
    "imageCredit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignStorySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSource" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "url" TEXT NOT NULL,
    "relevance" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "netMediaAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "totalCharged" INTEGER NOT NULL,
    "reachFunded" INTEGER NOT NULL,
    "backerName" TEXT NOT NULL,
    "backerEmail" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "supportNote" TEXT,
    "paymentProvider" TEXT NOT NULL DEFAULT 'simulated_escrow',
    "paymentStatus" "ContributionStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "receiptReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewOutcome" NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignActivity" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "advertisingBudgetAllocated" INTEGER NOT NULL,
    "advertisingSpend" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "estimatedReach" INTEGER NOT NULL,
    "measuredReach" INTEGER,
    "reportingStatus" "ReportStatus" NOT NULL DEFAULT 'PROJECTED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmplificationUpdate" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "channels" TEXT[],
    "screenshotUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmplificationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_status_category_idx" ON "Campaign"("status", "category");

-- CreateIndex
CREATE INDEX "Campaign_slug_idx" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "CampaignDraft_ownerId_idx" ON "CampaignDraft"("ownerId");

-- CreateIndex
CREATE INDEX "CampaignDraft_anonymousToken_idx" ON "CampaignDraft"("anonymousToken");

-- CreateIndex
CREATE INDEX "CampaignStorySection_campaignId_idx" ON "CampaignStorySection"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignSource_campaignId_idx" ON "CampaignSource"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_receiptReference_key" ON "Contribution"("receiptReference");

-- CreateIndex
CREATE INDEX "Contribution_campaignId_idx" ON "Contribution"("campaignId");

-- CreateIndex
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");

-- CreateIndex
CREATE INDEX "ReviewDecision_campaignId_idx" ON "ReviewDecision"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignActivity_campaignId_idx" ON "CampaignActivity"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignReport_campaignId_key" ON "CampaignReport"("campaignId");

-- CreateIndex
CREATE INDEX "AmplificationUpdate_campaignId_idx" ON "AmplificationUpdate"("campaignId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDraft" ADD CONSTRAINT "CampaignDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignStorySection" ADD CONSTRAINT "CampaignStorySection_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSource" ADD CONSTRAINT "CampaignSource_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReport" ADD CONSTRAINT "CampaignReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmplificationUpdate" ADD CONSTRAINT "AmplificationUpdate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
