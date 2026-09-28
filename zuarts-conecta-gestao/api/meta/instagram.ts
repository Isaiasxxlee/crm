import { z } from "zod";
import type { Prisma } from "../generated/client.js";
import type { MessageType } from "../generated/enums.js";
import { META } from "./config.js";
import type { MetaMessageEvent } from "./event.js";

const externalId = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1).max(120));

const scopedId = z.object({ id: externalId }).passthrough();

const attachment = z
  .object({
    type: z.string(),
    payload: z.object({ url: z.string().optional() }).passthrough().nullish(),
  })
  .passthrough();

const messagingItem = z
  .object({
    sender: scopedId,
    recipient: scopedId,
    timestamp: z.union([z.number(), z.string()]).optional(),
    message: z
      .object({
        mid: z.string().trim().min(1).max(255),
        text: z.string().optional(),
        attachments: z.array(attachment).optional(),
        is_echo: z.boolean().optional(),
        is_deleted: z.boolean().optional(),
        is_unsupported: z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const change = z.object({ field: z.string(), value: z.unknown() }).passthrough();

const entry = z
  .object({
    id: externalId.optional(),
    messaging: z.array(z.unknown()).optional(),
    changes: z.array(z.unknown()).optional(),
  })
  .passthrough();

type MessagingItem = z.infer<typeof messagingItem>;

const ATTACHMENT_TYPES: Record<string, MessageType> = {
  image: "IMAGE",
  audio: "AUDIO",
  video: "VIDEO",
  ig_reel: "VIDEO",
  reel: "VIDEO",
  file: "FILE",
};

export function parseInstagramEntries(entries: readonly unknown[]): { events: MetaMessageEvent[]; ignored: number } {
  const events: MetaMessageEvent[] = [];
  let ignored = 0;
  for (const rawEntry of entries) {
    const parsedEntry = entry.safeParse(rawEntry);
    if (!parsedEntry.success) {
      ignored++;
      continue;
    }
    const entryId = parsedEntry.data.id?.trim();
    for (const candidate of messagingCandidates(parsedEntry.data)) {
      const event = toEvent(candidate, entryId);
      if (event) events.push(event);
      else ignored++;
    }
  }
  return { events, ignored };
}

function messagingCandidates(value: z.infer<typeof entry>): unknown[] {
  const fromMessaging = value.messaging ?? [];
  const fromChanges = (value.changes ?? []).flatMap((raw) => {
    const parsed = change.safeParse(raw);
    return parsed.success && parsed.data.field === META.instagram.messagesField ? [parsed.data.value] : [];
  });
  return [...fromMessaging, ...fromChanges];
}

function toEvent(raw: unknown, entryId: string | undefined): MetaMessageEvent | null {
  const parsed = messagingItem.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (item.message.is_deleted) return null;
  const isEcho = item.message.is_echo === true;
  const businessId = isEcho ? item.sender.id : item.recipient.id;
  const participantId = isEcho ? item.recipient.id : item.sender.id;
  const accountIds = [businessId, entryId].filter((id): id is string => Boolean(id));
  return {
    channelType: "INSTAGRAM",
    accountIds: [...new Set(accountIds)],
    participantId,
    senderId: item.sender.id,
    direction: isEcho ? "OUTBOUND" : "INBOUND",
    externalMessageId: item.message.mid,
    messageType: messageTypeOf(item),
    text: item.message.text?.length ? item.message.text : null,
    sentAt: sentAtOf(item.timestamp),
    rawPayload: item as Prisma.InputJsonObject,
  };
}

function messageTypeOf(item: MessagingItem): MessageType {
  if (item.message.is_unsupported) return "UNKNOWN";
  const first = item.message.attachments?.[0];
  if (first) return ATTACHMENT_TYPES[first.type] ?? "UNKNOWN";
  return item.message.text?.length ? "TEXT" : "UNKNOWN";
}

function sentAtOf(value: number | string | undefined): Date {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === undefined || !Number.isFinite(numeric) || numeric <= 0) return new Date();
  const ms = numeric < META.timestamp.secondsThreshold ? numeric * META.timestamp.secondMs : numeric;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
