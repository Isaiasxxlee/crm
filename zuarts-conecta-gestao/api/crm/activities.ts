import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { ACTIVITY_TYPE_VALUES } from "./field-enums.js";
import { ownedContact, ownedCrmCompany, ownedDeal, requireOwnedRefs } from "./refs.js";

const PREFIX = "/api/crm/activities";

const FIELDS: FieldRules = {
  type: { type: "enum", values: ACTIVITY_TYPE_VALUES },
  subject: { type: "string-null" },
  body: { type: "string-null" },
  occurredAt: { type: "date-null" },
  dueAt: { type: "date-null" },
  completedAt: { type: "date-null" },
  meta: { type: "json" },
  crmCompanyId: { type: "uuid-null" },
  contactId: { type: "uuid-null" },
  dealId: { type: "uuid-null" },
};

export async function handleActivities(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const context = await requireContext(req);
  if (!context) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  const tenantId = context.company.id;
  const userId = context.user.id;

  if (pathname === PREFIX) {
    if (req.method === "GET") {
      await listActivities(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createActivity(req, res, tenantId, userId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getActivity(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateActivity(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteActivity(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listActivities(res: ServerResponse, tenantId: string): Promise<void> {
  const activities = await prisma.activity.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: activities });
}

async function createActivity(
  req: IncomingMessage,
  res: ServerResponse,
  tenantId: string,
  userId: string,
): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["type"]);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  const refs = await requireOwnedRefs(tenantId, [
    { field: "crmCompanyId", id: parsed.data.crmCompanyId, owns: ownedCrmCompany },
    { field: "contactId", id: parsed.data.contactId, owns: ownedContact },
    { field: "dealId", id: parsed.data.dealId, owns: ownedDeal },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const activity = await prisma.activity.create({
      data: { ...parsed.data, companyId: tenantId, createdById: userId } as unknown as Prisma.ActivityCreateInput,
    });
    sendJson(res, 201, { ok: true, data: activity });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getActivity(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const activity = await prisma.activity.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!activity) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: activity });
}

async function updateActivity(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.activity.findFirst({
    where: { id, companyId: tenantId },
    select: { id: true },
  });
  if (!existing) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, []);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    sendJson(res, 400, { ok: false, error: "empty_update" });
    return;
  }
  const refs = await requireOwnedRefs(tenantId, [
    { field: "crmCompanyId", id: parsed.data.crmCompanyId, owns: ownedCrmCompany },
    { field: "contactId", id: parsed.data.contactId, owns: ownedContact },
    { field: "dealId", id: parsed.data.dealId, owns: ownedDeal },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const activity = await prisma.activity.update({
      where: { id },
      data: parsed.data as Prisma.ActivityUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: activity });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteActivity(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const result = await prisma.activity.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}