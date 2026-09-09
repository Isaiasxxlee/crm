import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { LEAD_STATUS_VALUES, RECORD_SOURCE_VALUES } from "./field-enums.js";
import { ownedContact, ownedCrmCompany, ownedMember, requireOwnedRefs } from "./refs.js";

const PREFIX = "/api/crm/leads";

const FIELDS: FieldRules = {
  firstName: { type: "string" },
  lastName: { type: "string-null" },
  email: { type: "string-null" },
  phone: { type: "string-null" },
  source: { type: "enum", values: RECORD_SOURCE_VALUES },
  status: { type: "enum", values: LEAD_STATUS_VALUES },
  notes: { type: "string-null" },
  crmCompanyId: { type: "uuid-null" },
  contactId: { type: "uuid-null" },
  ownerId: { type: "uuid-null" },
};

export async function handleLeads(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  const context = await requireContext(req);
  if (!context) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  const tenantId = context.company.id;

  if (pathname === PREFIX) {
    if (req.method === "GET") {
      await listLeads(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createLead(req, res, tenantId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getLead(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateLead(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteLead(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listLeads(res: ServerResponse, tenantId: string): Promise<void> {
  const leads = await prisma.lead.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: leads });
}

async function createLead(req: IncomingMessage, res: ServerResponse, tenantId: string): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["firstName"]);
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
    const lead = await prisma.lead.create({
      data: { ...parsed.data, companyId: tenantId } as unknown as Prisma.LeadCreateInput,
    });
    sendJson(res, 201, { ok: true, data: lead });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getLead(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const lead = await prisma.lead.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!lead) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: lead });
}

async function updateLead(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.lead.findFirst({
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
    const lead = await prisma.lead.update({
      where: { id },
      data: parsed.data as Prisma.LeadUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: lead });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteLead(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const dependencies =
    (await prisma.followUp.count({ where: { leadId: id, companyId: tenantId } })) +
    (await prisma.evidence.count({ where: { leadId: id, companyId: tenantId } }));
  if (dependencies > 0) {
    sendJson(res, 409, { ok: false, error: "lead_in_use" });
    return;
  }
  const result = await prisma.lead.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}