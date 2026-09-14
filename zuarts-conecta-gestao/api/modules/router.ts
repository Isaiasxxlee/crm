import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateUser, findContext } from "../tenant.js";
import { sendJson, sendPrismaError } from "../crm/http.js";
import { getCompanyModules } from "./service.js";

export async function handleModulesRequest(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await authenticateUser(req.headers);
    if (!user) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const context = await findContext(user.id);
    if (!context) return sendJson(res, 403, { ok: false, error: "company_required" });
    if (url.pathname !== "/api/modules") return sendJson(res, 404, { ok: false, error: "not_found" });
    if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    const data = await getCompanyModules(context.company.id);
    return sendJson(res, 200, { ok: true, data });
  } catch (error) {
    sendPrismaError(res, error);
  }
}