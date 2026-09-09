-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('MANUAL', 'IMPORT', 'API', 'WEBFORM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'OPEN_DEAL', 'UNQUALIFIED', 'CONNECTED', 'BAD_TIMING');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('DEMO_BOOKED', 'QUALIFIED_TO_BUY', 'UNQUALIFIED_TO_BUY', 'DECISION_MAKER_BOUGHT_IN', 'CONTRACT_SENT', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK', 'STAGE_CHANGE', 'ENRICHMENT');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CrmCompany" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "website" VARCHAR(500),
    "description" TEXT,
    "industry" VARCHAR(120),
    "subIndustry" VARCHAR(120),
    "city" VARCHAR(120),
    "stateCode" VARCHAR(40),
    "country" VARCHAR(80),
    "phone" VARCHAR(40),
    "email" VARCHAR(320),
    "linkedinUrl" VARCHAR(500),
    "source" "RecordSource" NOT NULL DEFAULT 'MANUAL',
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID,
    "firstName" VARCHAR(120) NOT NULL,
    "lastName" VARCHAR(120),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "title" VARCHAR(120),
    "source" "RecordSource" NOT NULL DEFAULT 'MANUAL',
    "ownerId" UUID,
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID,
    "contactId" UUID,
    "firstName" VARCHAR(120) NOT NULL,
    "lastName" VARCHAR(120),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "source" "RecordSource" NOT NULL DEFAULT 'MANUAL',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "ownerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID,
    "contactId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'DEMO_BOOKED',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(14,2),
    "currency" VARCHAR(8) NOT NULL DEFAULT 'BRL',
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedReason" VARCHAR(200),
    "ownerId" UUID,
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" VARCHAR(280),
    "body" TEXT,
    "occurredAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "crmCompanyId" UUID,
    "contactId" UUID,
    "dealId" UUID,
    "createdById" UUID NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID,
    "contactId" UUID,
    "leadId" UUID,
    "dealId" UUID,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "kind" VARCHAR(80) NOT NULL,
    "title" VARCHAR(280),
    "content" TEXT,
    "url" VARCHAR(500),
    "crmCompanyId" UUID,
    "contactId" UUID,
    "leadId" UUID,
    "dealId" UUID,
    "source" "RecordSource" NOT NULL DEFAULT 'MANUAL',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "kind" VARCHAR(120) NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "subject" VARCHAR(280),
    "payload" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "leasedUntil" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "taskId" UUID,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB,
    "result" JSONB,
    "summary" TEXT,
    "errorCode" VARCHAR(120),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmCompany_companyId_idx" ON "CrmCompany"("companyId");

-- CreateIndex
CREATE INDEX "CrmCompany_companyId_name_idx" ON "CrmCompany"("companyId", "name");

-- CreateIndex
CREATE INDEX "CrmCompany_companyId_archivedAt_idx" ON "CrmCompany"("companyId", "archivedAt");

-- CreateIndex
CREATE INDEX "CrmCompany_companyId_lastActivityAt_idx" ON "CrmCompany"("companyId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Contact_companyId_crmCompanyId_idx" ON "Contact"("companyId", "crmCompanyId");

-- CreateIndex
CREATE INDEX "Contact_companyId_ownerId_idx" ON "Contact"("companyId", "ownerId");

-- CreateIndex
CREATE INDEX "Contact_companyId_archivedAt_idx" ON "Contact"("companyId", "archivedAt");

-- CreateIndex
CREATE INDEX "Contact_companyId_lastActivityAt_idx" ON "Contact"("companyId", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_companyId_email_key" ON "Contact"("companyId", "email");

-- CreateIndex
CREATE INDEX "Lead_companyId_status_idx" ON "Lead"("companyId", "status");

-- CreateIndex
CREATE INDEX "Lead_companyId_crmCompanyId_idx" ON "Lead"("companyId", "crmCompanyId");

-- CreateIndex
CREATE INDEX "Lead_companyId_ownerId_idx" ON "Lead"("companyId", "ownerId");

-- CreateIndex
CREATE INDEX "Lead_companyId_contactId_idx" ON "Lead"("companyId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_companyId_email_key" ON "Lead"("companyId", "email");

-- CreateIndex
CREATE INDEX "Deal_companyId_crmCompanyId_idx" ON "Deal"("companyId", "crmCompanyId");

-- CreateIndex
CREATE INDEX "Deal_companyId_ownerId_idx" ON "Deal"("companyId", "ownerId");

-- CreateIndex
CREATE INDEX "Deal_companyId_stage_idx" ON "Deal"("companyId", "stage");

-- CreateIndex
CREATE INDEX "Deal_companyId_expectedCloseDate_idx" ON "Deal"("companyId", "expectedCloseDate");

-- CreateIndex
CREATE INDEX "Deal_companyId_archivedAt_idx" ON "Deal"("companyId", "archivedAt");

-- CreateIndex
CREATE INDEX "Deal_companyId_lastActivityAt_idx" ON "Deal"("companyId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_createdAt_idx" ON "Activity"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_dueAt_idx" ON "Activity"("companyId", "dueAt");

-- CreateIndex
CREATE INDEX "Activity_companyId_createdById_idx" ON "Activity"("companyId", "createdById");

-- CreateIndex
CREATE INDEX "FollowUp_companyId_scheduledAt_idx" ON "FollowUp"("companyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUp_companyId_completedAt_idx" ON "FollowUp"("companyId", "completedAt");

-- CreateIndex
CREATE INDEX "FollowUp_companyId_createdById_idx" ON "FollowUp"("companyId", "createdById");

-- CreateIndex
CREATE INDEX "Evidence_companyId_createdAt_idx" ON "Evidence"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Evidence_companyId_createdById_idx" ON "Evidence"("companyId", "createdById");

-- CreateIndex
CREATE INDEX "AgentTask_companyId_status_idx" ON "AgentTask"("companyId", "status");

-- CreateIndex
CREATE INDEX "AgentTask_companyId_dueAt_idx" ON "AgentTask"("companyId", "dueAt");

-- CreateIndex
CREATE INDEX "AgentTask_companyId_createdAt_idx" ON "AgentTask"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_companyId_status_idx" ON "AgentRun"("companyId", "status");

-- CreateIndex
CREATE INDEX "AgentRun_companyId_taskId_idx" ON "AgentRun"("companyId", "taskId");

-- CreateIndex
CREATE INDEX "AgentRun_companyId_createdAt_idx" ON "AgentRun"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
