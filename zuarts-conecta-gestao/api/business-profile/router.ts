import type { IncomingMessage, ServerResponse } from "node:http";
import { prisma } from "../db.js";
import { authenticateUser, findContext } from "../tenant.js";
import { readJsonBody, sendJson, sendPrismaError } from "../crm/http.js";
import { catalogId, profileInput } from "./validation.js";

const include = { businessType: { include: { segment: true } }, specialty: true } as const;
const orderBy = [{ position: "asc" }, { name: "asc" }] as const;

export async function handleBusinessProfileRequest(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await authenticateUser(req.headers);
    if (!user) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const context = await findContext(user.id);
    if (!context) return sendJson(res, 403, { ok: false, error: "company_required" });
    const companyId = context.company.id;
    const pathname = url.pathname;
    if (req.method === "GET" && pathname === "/api/business-profile/segments") {
      const data = await prisma.businessSegment.findMany({ orderBy: [...orderBy] });
      return sendJson(res, 200, { ok: true, data });
    }
    if (req.method === "GET" && pathname === "/api/business-profile/types") {
      const segmentId = catalogId.safeParse(url.searchParams.get("segmentId"));
      if (!segmentId.success) return sendJson(res, 400, { ok: false, error: "invalid_segment_id" });
      const segment = await prisma.businessSegment.findUnique({ where: { id: segmentId.data } });
      if (!segment) return sendJson(res, 404, { ok: false, error: "segment_not_found" });
      const data = await prisma.businessType.findMany({ where: { segmentId: segment.id }, orderBy: [...orderBy] });
      return sendJson(res, 200, { ok: true, data });
    }
    if (req.method === "GET" && pathname === "/api/business-profile/specialties") {
      const businessTypeId = catalogId.safeParse(url.searchParams.get("businessTypeId"));
      if (!businessTypeId.success) return sendJson(res, 400, { ok: false, error: "invalid_business_type_id" });
      const type = await prisma.businessType.findUnique({ where: { id: businessTypeId.data } });
      if (!type) return sendJson(res, 404, { ok: false, error: "business_type_not_found" });
      const data = await prisma.specialty.findMany({ where: { businessTypeId: type.id }, orderBy: [...orderBy] });
      return sendJson(res, 200, { ok: true, data });
    }
    if (pathname !== "/api/business-profile") return sendJson(res, 404, { ok: false, error: "not_found" });
    if (req.method === "GET") {
      const data = await prisma.businessProfile.findUnique({ where: { companyId }, include });
      return sendJson(res, 200, { ok: true, data });
    }
    if (req.method !== "PUT") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    const origin = req.headers.origin;
    if (origin && origin !== new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3001").origin) {
      return sendJson(res, 403, { ok: false, error: "invalid_origin" });
    }
    const parsed = profileInput.safeParse(await readJsonBody(req));
    if (!parsed.success) return sendJson(res, 400, { ok: false, error: "invalid_profile" });
    const { segmentId, businessTypeId, specialtyId } = parsed.data;
    const segment = await prisma.businessSegment.findUnique({ where: { id: segmentId } });
    if (!segment) return sendJson(res, 404, { ok: false, error: "segment_not_found" });
    const type = await prisma.businessType.findUnique({ where: { id: businessTypeId } });
    if (!type) return sendJson(res, 404, { ok: false, error: "business_type_not_found" });
    if (type.segmentId !== segmentId) return sendJson(res, 400, { ok: false, error: "incompatible_business_type" });
    if (specialtyId) {
      const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
      if (!specialty) return sendJson(res, 404, { ok: false, error: "specialty_not_found" });
      if (specialty.businessTypeId !== businessTypeId) {
        return sendJson(res, 400, { ok: false, error: "incompatible_specialty" });
      }
    }
    const data = await prisma.businessProfile.upsert({
      where: { companyId },
      create: { companyId, businessTypeId, specialtyId },
      update: { businessTypeId, specialtyId },
      include,
    });
    return sendJson(res, 200, { ok: true, data });
  } catch (error) {
    sendPrismaError(res, error);
  }
}
