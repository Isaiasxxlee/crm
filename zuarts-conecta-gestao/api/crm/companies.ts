import type { IncomingMessage, ServerResponse } from "node:http";
import { Prisma } from "../generated/client.js";
import { prisma } from "../db.js";
import { requireContext } from "./context.js";
import { idFromPath, readJsonBody, sendJson, sendPrismaError } from "./http.js";
import { parseFields, type FieldRules } from "./validate.js";
import { RECORD_SOURCE_VALUES } from "./field-enums.js";

const PREFIX = "/api/crm/companies";

const FIELDS: FieldRules = {
  name: { type: "string" },
  website: { type: "string-null" },
  description: { type: "string-null" },
  industry: { type: "string-null" },
  subIndustry: { type: "string-null" },
  city: { type: "string-null" },
  stateCode: { type: "string-null" },
  country: { type: "string-null" },
  phone: { type: "string-null" },
  email: { type: "string-null" },
  linkedinUrl: { type: "string-null" },
  source: { type: "enum", values: RECORD_SOURCE_VALUES },
};

export async function handleCompanies(
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
      await listCompanies(res, tenantId);
      return;
    }
    if (req.method === "POST") {
      await createCompany(req, res, tenantId);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  const id = idFromPath(pathname, PREFIX);
  if (id) {
    if (req.method === "GET") {
      await getCompany(res, tenantId, id);
      return;
    }
    if (req.method === "PATCH") {
      await updateCompany(req, res, tenantId, id);
      return;
    }
    if (req.method === "DELETE") {
      await deleteCompany(res, tenantId, id);
      return;
    }
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function listCompanies(res: ServerResponse, tenantId: string): Promise<void> {
  const companies = await prisma.crmCompany.findMany({
    where: { companyId: tenantId },
    orderBy: { createdAt: "desc" },
  });
  sendJson(res, 200, { ok: true, data: companies });
}

async function createCompany(req: IncomingMessage, res: ServerResponse, tenantId: string): Promise<void> {
  const body = await readJsonBody(req);
  const parsed = parseFields(body, FIELDS, ["name"]);
  if (!parsed.ok) {
    sendJson(res, parsed.status, { ok: false, error: parsed.error });
    return;
  }
  try {
    const company = await prisma.crmCompany.create({
      data: { ...parsed.data, companyId: tenantId } as unknown as Prisma.CrmCompanyCreateInput,
    });
    sendJson(res, 201, { ok: true, data: company });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function getCompany(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const company = await prisma.crmCompany.findFirst({
    where: { id, companyId: tenantId },
  });
  if (!company) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: company });
}

async function updateCompany(req: IncomingMessage, res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const existing = await prisma.crmCompany.findFirst({
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
  try {
    const company = await prisma.crmCompany.update({
      where: { id },
      data: parsed.data as Prisma.CrmCompanyUpdateInput,
    });
    sendJson(res, 200, { ok: true, data: company });
  } catch (error) {
    sendPrismaError(res, error);
  }
}

async function deleteCompany(res: ServerResponse, tenantId: string, id: string): Promise<void> {
  const dependencies =
    (await prisma.contact.count({ where: { crmCompanyId: id, companyId: tenantId } })) +
    (await prisma.lead.count({ where: { crmCompanyId: id, companyId: tenantId } })) +
    (await prisma.deal.count({ where: { crmCompanyId: id, companyId: tenantId } }));
  if (dependencies > 0) {
    sendJson(res, 409, { ok: false, error: "company_in_use" });
    return;
  }
  const result = await prisma.crmCompany.deleteMany({ where: { id, companyId: tenantId } });
  if (result.count === 0) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  sendJson(res, 200, { ok: true, data: { id, deleted: true } });
}