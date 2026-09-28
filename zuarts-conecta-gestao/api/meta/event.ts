import type { Prisma } from "../generated/client.js";
import type { ChannelType, MessageDirection, MessageType } from "../generated/enums.js";

export type MetaMessageEvent = {
  channelType: ChannelType;
  accountIds: string[];
  participantId: string;
  senderId: string;
  direction: MessageDirection;
  externalMessageId: string;
  messageType: MessageType;
  text: string | null;
  sentAt: Date;
  rawPayload: Prisma.InputJsonObject;
};

export type ParsedWebhook =
  | { ok: true; object: string; events: MetaMessageEvent[]; ignored: number }
  | { ok: false; error: string };
