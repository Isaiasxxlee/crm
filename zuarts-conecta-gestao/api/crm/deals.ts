import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { DEAL_STAGE_VALUES } from "./field-enums.js";
import { ownedContact, ownedCrmCompany, ownedMember, requireOwnedRefs } from "./refs.js";

const PREFIX = "/api/crm/deals";

const FIELDS: FieldRules = {
  name: { type: "string" },
  description: { type: "string-null" },
  stage: { type: "enum", values: DEAL_STAGE_VALUES },
  amount: { type: "number-null" },
  currency: { type: "string" },
  expectedCloseDate: { type: "date-null" },
  closedAt: { type: "date-null" },
  closedReason: { type: "string-null" },
  crmCompanyId: { type: "uuid-null" },
  contactId: { type: "uuid-null" },
  ownerId: { type: "uuid-null" },
};

export async function handleDeals(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const context = await requireContext(req);
  if (!context) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  const tenantId = context.company.id;

  if (pathname === PREFIX) {
    if (req.method === "GET") {
      await listDeals(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createDeal(req, res, tenantId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getDeal(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateDeal(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteDeal(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listDeals(res: ServerResponse, tenantId: string): Promise<void> {
  const deals = await prisma.deal.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: deals });
}

async function createDeal(req: IncomingMessage, res: ServerResponse, tenantId: string): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["name"]);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  const refs = await requireOwnedRefs(tenantId, [
    { field: "crmCompanyId", id: parsed.data.crmCompanyId, owns: ownedCrmCompany },
    { field: "contactId", id: parsed.data.contactId, owns: ownedContact },
    { field: "ownerId", id: parsed.data.ownerId, owns: ownedMember },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const deal = await prisma.deal.create({
      data: { ...parsed.data, companyId: tenantId } as unknown as Prisma.DealCreateInput,
    });
    sendJson(res, 201, { ok: true, data: deal });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getDeal(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const deal = await prisma.deal.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!deal) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: deal });
}

async function updateDeal(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.deal.findFirst({
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
    { field: "ownerId", id: parsed.data.ownerId, owns: ownedMember },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const deal = await prisma.deal.update({
      where: { id },
      data: parsed.data as Prisma.DealUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: deal });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteDeal(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const dependencies =
    (await prisma.activity.count({ where: { dealId: id, companyId: tenantId } })) +
    (await prisma.followUp.count({ where: { dealId: id, companyId: tenantId } })) +
    (await prisma.evidence.count({ where: { dealId: id, companyId: tenantId } }));
  if (dependencies > 0) {
    sendJson(res, 409, { ok: false, error: "deal_in_use" });
    return;
  }
  const result = await prisma.deal.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}