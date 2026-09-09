import type { IncomingMessage, ServerResponse } from "node:http";
import { handleActivities } from "./activities.js";
import { handleCompanies } from "./companies.js";
import { handleContacts } from "./contacts.js";
import { handleDeals } from "./deals.js";
import { handleEvidenceList } from "./evidence.js";
import { handleFollowUps } from "./follow-ups.js";
import { handleLeads } from "./leads.js";
import { sendJson } from "./http.js";

type Handler = (req: IncomingMessage, res: ServerResponse, pathname: string) => Promise<void>;

const ROUTES: { prefix: string; handler: Handler }[] = [
  { prefix: "/api/crm/companies", handler: handleCompanies },
  { prefix: "/api/crm/contacts", handler: handleContacts },
  { prefix: "/api/crm/leads", handler: handleLeads },
  { prefix: "/api/crm/deals", handler: handleDeals },
  { prefix: "/api/crm/activities", handler: handleActivities },
  { prefix: "/api/crm/follow-ups", handler: handleFollowUps },
  { prefix: "/api/crm/evidence", handler: handleEvidenceList },
];

export async function handleCrmRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const crmPrefix = "/api/crm";
  if (pathname !== crmPrefix && !pathname.startsWith(crmPrefix + "/")) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  for (const route of ROUTES) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + "/")) {
      await route.handler(req, res, pathname);
      return;
    }
  }
  sendJson(res, 404, { ok: false, error: "not_found" });
}