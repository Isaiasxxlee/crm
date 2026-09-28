-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('INSTAGRAM', 'MESSENGER', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Channel" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "ChannelType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "externalId" VARCHAR(120) NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "externalConversationId" VARCHAR(120) NOT NULL,
    "participantName" VARCHAR(200),
    "contactId" UUID,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "externalMessageId" VARCHAR(255) NOT NULL,
    "senderExternalId" VARCHAR(120) NOT NULL,
    "senderName" VARCHAR(200),
    "direction" "MessageDirection" NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'UNKNOWN',
    "text" TEXT,
    "rawPayload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_companyId_idx" ON "Channel"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_type_externalId_key" ON "Channel"("type", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_id_companyId_key" ON "Channel"("id", "companyId");

-- CreateIndex
CREATE INDEX "Conversation_companyId_lastMessageAt_idx" ON "Conversation"("companyId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_companyId_channelId_idx" ON "Conversation"("companyId", "channelId");

-- CreateIndex
CREATE INDEX "Conversation_companyId_contactId_idx" ON "Conversation"("companyId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_channelId_externalConversationId_key" ON "Conversation"("channelId", "externalConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_id_companyId_key" ON "Conversation"("id", "companyId");

-- CreateIndex
CREATE INDEX "Message_companyId_conversationId_sentAt_idx" ON "Message"("companyId", "conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_companyId_channelId_externalMessageId_key" ON "Message"("companyId", "channelId", "externalMessageId");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelId_companyId_fkey" FOREIGN KEY ("channelId", "companyId") REFERENCES "Channel"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_companyId_fkey" FOREIGN KEY ("channelId", "companyId") REFERENCES "Channel"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_companyId_fkey" FOREIGN KEY ("conversationId", "companyId") REFERENCES "Conversation"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;
