import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { RECORD_SOURCE_VALUES } from "./field-enums.js";
import { ownedCrmCompany, ownedMember, requireOwnedRefs } from "./refs.js";

const PREFIX = "/api/crm/contacts";

const FIELDS: FieldRules = {
  firstName: { type: "string" },
  lastName: { type: "string-null" },
  email: { type: "string-null" },
  phone: { type: "string-null" },
  title: { type: "string-null" },
  source: { type: "enum", values: RECORD_SOURCE_VALUES },
  crmCompanyId: { type: "uuid-null" },
  ownerId: { type: "uuid-null" },
};

export async function handleContacts(
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

  if (pathname === PREFIX) {
    if (req.method === "GET") {
      await listContacts(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createContact(req, res, tenantId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getContact(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateContact(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteContact(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listContacts(res: ServerResponse, tenantId: string): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: contacts });
}

async function createContact(req: IncomingMessage, res: ServerResponse, tenantId: string): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["firstName"]);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  const refs = await requireOwnedRefs(tenantId, [
    { field: "crmCompanyId", id: parsed.data.crmCompanyId, owns: ownedCrmCompany },
    { field: "ownerId", id: parsed.data.ownerId, owns: ownedMember },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const contact = await prisma.contact.create({
      data: { ...parsed.data, companyId: tenantId } as unknown as Prisma.ContactCreateInput,
    });
    sendJson(res, 201, { ok: true, data: contact });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getContact(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const contact = await prisma.contact.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!contact) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: contact });
}

async function updateContact(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.contact.findFirst({
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
    { field: "ownerId", id: parsed.data.ownerId, owns: ownedMember },
  ]);
  if (!refs.ok) {
    sendJson(res, 422, { ok: false, error: "invalid_reference", field: refs.field });
    return;
  }
  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: parsed.data as Prisma.ContactUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: contact });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteContact(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const dependencies =
    (await prisma.activity.count({ where: { contactId: id, companyId: tenantId } })) +
    (await prisma.followUp.count({ where: { contactId: id, companyId: tenantId } })) +
    (await prisma.evidence.count({ where: { contactId: id, companyId: tenantId } })) +
    (await prisma.deal.count({ where: { contactId: id, companyId: tenantId } })) +
    (await prisma.lead.count({ where: { contactId: id, companyId: tenantId } }));
  if (dependencies > 0) {
    sendJson(res, 409, { ok: false, error: "contact_in_use" });
    return;
  }
  const result = await prisma.contact.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}