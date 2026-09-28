import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticateUser, findContext } from "../tenant.js";
import { sendJson, sendPrismaError } from "../crm/http.js";
import { INBOX } from "./config.js";

const conversationId = z.uuid();

function limitInput(defaultLimit: number, maxLimit: number) {
  return z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit);
}

const conversationLimit = limitInput(INBOX.conversations.defaultLimit, INBOX.conversations.maxLimit);
const messageLimit = limitInput(INBOX.messages.defaultLimit, INBOX.messages.maxLimit);

const conversationSelect = {
  id: true,
  status: true,
  externalConversationId: true,
  participantName: true,
  lastMessageAt: true,
  createdAt: true,
  channel: { select: { id: true, type: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { messages: true } },
} as const;

const messageSelect = {
  id: true,
  direction: true,
  messageType: true,
  text: true,
  senderExternalId: true,
  senderName: true,
  sentAt: true,
} as const;

export async function handleInboxRequest(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await authenticateUser(req.headers);
    if (!user) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const context = await findContext(user.id);
    if (!context) return sendJson(res, 403, { ok: false, error: "company_required" });
    if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    const companyId = context.company.id;
    const segments = url.pathname.slice(INBOX.path.length).split("/").filter(Boolean);
    if (segments[0] !== "conversations" || segments.length > 3) {
      return sendJson(res, 404, { ok: false, error: "not_found" });
    }
    if (segments.length === 1) return listConversations(res, companyId, url);
    const id = conversationId.safeParse(segments[1]);
    if (!id.success) return sendJson(res, 400, { ok: false, error: "invalid_conversation_id" });
    if (segments.length === 2) return getConversation(res, companyId, id.data);
    if (segments[2] === "messages") return listMessages(res, companyId, id.data, url);
    return sendJson(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function listConversations(res: ServerResponse, companyId: string, url: URL) {
  const limit = conversationLimit.safeParse(url.searchParams.get("limit") ?? undefined);
  if (!limit.success) return sendJson(res, 400, { ok: false, error: "invalid_limit" });
  const rows = await prisma.conversation.findMany({
    where: { companyId },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit.data,
    select: {
      ...conversationSelect,
      messages: { orderBy: { sentAt: "desc" }, take: 1, select: messageSelect },
    },
  });
  const data = rows.map(({ messages, _count, ...conversation }) => ({
    ...conversation,
    messageCount: _count.messages,
    lastMessage: messages[0] ?? null,
  }));
  return sendJson(res, 200, { ok: true, data });
}

async function getConversation(res: ServerResponse, companyId: string, id: string) {
  const row = await prisma.conversation.findFirst({ where: { id, companyId }, select: conversationSelect });
  if (!row) return sendJson(res, 404, { ok: false, error: "not_found" });
  const { _count, ...conversation } = row;
  return sendJson(res, 200, { ok: true, data: { ...conversation, messageCount: _count.messages } });
}

async function listMessages(res: ServerResponse, companyId: string, id: string, url: URL) {
  const limit = messageLimit.safeParse(url.searchParams.get("limit") ?? undefined);
  if (!limit.success) return sendJson(res, 400, { ok: false, error: "invalid_limit" });
  const conversation = await prisma.conversation.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!conversation) return sendJson(res, 404, { ok: false, error: "not_found" });
  const latest = await prisma.message.findMany({
    where: { conversationId: conversation.id, companyId },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    take: limit.data,
    select: messageSelect,
  });
  return sendJson(res, 200, { ok: true, data: latest.reverse() });
}
