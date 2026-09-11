import type { IncomingMessage, ServerResponse } from "node:http";
import { prisma } from "../db.js";
import { authenticateUser, findContext } from "../tenant.js";
import { readJsonBody, sendJson, sendPrismaError } from "../crm/http.js";
import { getCompanyUsage, PlanError, planSelectionReason, selectCompanyPlan } from "./service.js";
import { planIdInput, planSelection } from "./validation.js";

export async function handlePlansRequest(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await authenticateUser(req.headers);
    if (!user) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const context = await findContext(user.id);
    if (!context) return sendJson(res, 403, { ok: false, error: "company_required" });
    const canManage = context.role === "OWNER" || context.role === "ADMIN";
    if (url.pathname === "/api/plans" && req.method === "GET") {
      const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] });
      const current = await getCompanyUsage(context.company.id);
      const data = plans.map((plan) => {
        const selectionReason = canManage ? planSelectionReason(plan, current) : "plan_change_forbidden";
        return { ...plan, canSelect: selectionReason === null, selectionReason };
      });
      return sendJson(res, 200, { ok: true, data });
    }
    if (url.pathname.startsWith("/api/plans/") && req.method === "GET") {
      const id = planIdInput.safeParse(url.pathname.slice("/api/plans/".length));
      if (!id.success) return sendJson(res, 400, { ok: false, error: "invalid_plan_id" });
      const data = await prisma.plan.findFirst({ where: { id: id.data, active: true } });
      return sendJson(res, data ? 200 : 404, data ? { ok: true, data } : { ok: false, error: "plan_not_found" });
    }
    if ((url.pathname === "/api/subscription" || url.pathname === "/api/subscription/usage") && req.method === "GET") {
      const data = await getCompanyUsage(context.company.id);
      return sendJson(res, 200, { ok: true, data: { ...data, canManage } });
    }
    if (url.pathname === "/api/subscription" && req.method === "PUT") {
      if (!canManage) return sendJson(res, 403, { ok: false, error: "plan_change_forbidden" });
      const origin = req.headers.origin;
      if (origin && origin !== new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3001").origin) {
        return sendJson(res, 403, { ok: false, error: "invalid_origin" });
      }
      const input = planSelection.safeParse(await readJsonBody(req));
      if (!input.success) return sendJson(res, 400, { ok: false, error: "invalid_plan_selection" });
      const data = await selectCompanyPlan(context.company.id, input.data.planId);
      return sendJson(res, 200, { ok: true, data: { ...data, canManage } });
    }
    return sendJson(res, url.pathname === "/api/plans" || url.pathname === "/api/subscription" ? 405 : 404, { ok: false, error: "unsupported_route" });
  } catch (error) {
    if (error instanceof PlanError) return sendJson(res, error.status, { ok: false, error: error.code });
    sendPrismaError(res, error);
  }
}
