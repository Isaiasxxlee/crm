import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { RECORD_SOURCE_VALUES } from "./field-enums.js";
import { ownedContact, ownedCrmCompany, ownedDeal, ownedLead, requireOwnedRefs } from "./refs.js";

const PREFIX = "/api/crm/evidence";

const FIELDS: FieldRules = {
  kind: { type: "string" },
  title: { type: "string-null" },
  content: { type: "string-null" },
  url: { type: "string-null" },
  source: { type: "enum", values: RECORD_SOURCE_VALUES },
  crmCompanyId: { type: "uuid-null" },
  contactId: { type: "uuid-null" },
  leadId: { type: "uuid-null" },
  dealId: { type: "uuid-null" },
};

export async function handleEvidenceList(
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
      await listEvidence(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createEvidence(req, res, tenantId, userId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getEvidence(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateEvidence(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteEvidence(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listEvidence(res: ServerResponse, tenantId: string): Promise<void> {
  const evidence = await prisma.evidence.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: evidence });
}

async function createEvidence(
  req: IncomingMessage,
  res: ServerResponse,
  tenantId: string,
  userId: string,
): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["kind"]);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  const refs = await requireOwnedRefs(tenantId, [
    { field: "crmCompanyId", id: parsed.data.crmCompanyId, owns: ownedCrmCompany },
    { field: "contactId", id: parsed.data.contactId, owns: ownedContact },
    { field: "leadId", id: parsed.data.leadId, owns: ownedLead },
    { field: "dealId", id: parsed.data.dealId, owns: ownedDeal },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const evidence = await prisma.evidence.create({
      data: { ...parsed.data, companyId: tenantId, createdById: userId } as unknown as Prisma.EvidenceCreateInput,
    });
    sendJson(res, 201, { ok: true, data: evidence });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getEvidence(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const evidence = await prisma.evidence.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!evidence) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: evidence });
}

async function updateEvidence(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.evidence.findFirst({
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
    { field: "leadId", id: parsed.data.leadId, owns: ownedLead },
    { field: "dealId", id: parsed.data.dealId, owns: ownedDeal },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const evidence = await prisma.evidence.update({
      where: { id },
      data: parsed.data as Prisma.EvidenceUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: evidence });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteEvidence(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const result = await prisma.evidence.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}