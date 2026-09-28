import { prisma } from "../db.js";
import type { MetaMessageEvent } from "./event.js";

export type StoreOutcome = "saved" | "duplicate" | "channel_not_found" | "channel_disabled";

type Log = (message: string) => void;

export async function storeMessageEvent(event: MetaMessageEvent, log: Log): Promise<StoreOutcome> {
  try {
    return await storeOnce(event, log);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return storeOnce(event, log);
  }
}

async function storeOnce(event: MetaMessageEvent, log: Log): Promise<StoreOutcome> {
  const channel = await findChannel(event);
  if (!channel) {
    log(`Canal não registrado: ${event.channelType} externalId=${event.accountIds.join(",")}`);
    return "channel_not_found";
  }
  if (channel.status !== "ACTIVE") {
    log(`Canal desativado: ${channel.type} channelId=${channel.id}`);
    return "channel_disabled";
  }
  log(`Canal identificado: ${channel.type} channelId=${channel.id}`);

  return prisma.$transaction(async (db) => {
    const conversation = await db.conversation.upsert({
      where: {
        channelId_externalConversationId: { channelId: channel.id, externalConversationId: event.participantId },
      },
      create: {
        companyId: channel.companyId,
        channelId: channel.id,
        externalConversationId: event.participantId,
      },
      update: {},
      select: { id: true },
    });
    log(`Conversa localizada/criada: ${conversation.id}`);

    const inserted = await db.message.createMany({
      data: [
        {
          companyId: channel.companyId,
          channelId: channel.id,
          conversationId: conversation.id,
          externalMessageId: event.externalMessageId,
          senderExternalId: event.senderId,
          direction: event.direction,
          messageType: event.messageType,
          text: event.text,
          rawPayload: event.rawPayload,
          sentAt: event.sentAt,
        },
      ],
      skipDuplicates: true,
    });
    if (inserted.count === 0) {
      log(`Mensagem duplicada ignorada: conversa ${conversation.id}`);
      return "duplicate";
    }

    await db.conversation.updateMany({
      where: {
        id: conversation.id,
        companyId: channel.companyId,
        OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: event.sentAt } }],
      },
      data: { lastMessageAt: event.sentAt },
    });
    log(`Mensagem salva: conversa ${conversation.id} tipo ${event.messageType} ${event.direction}`);
    return "saved";
  });
}

async function findChannel(event: MetaMessageEvent) {
  const channels = await prisma.channel.findMany({
    where: { type: event.channelType, externalId: { in: event.accountIds } },
    select: { id: true, companyId: true, type: true, status: true, externalId: true },
  });
  for (const accountId of event.accountIds) {
    const match = channels.find((channel) => channel.externalId === accountId);
    if (match) return match;
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
