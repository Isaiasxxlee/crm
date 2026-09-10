import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const projectDir = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 30000 + Math.floor(Math.random() * 4000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const RUN_ID = `crm${Date.now()}${Math.floor(Math.random() * 100000)}`;

const PASSWORD = "Test-Password-123";
const ENTITIES = ["companies", "contacts", "leads", "deals", "activities", "follow-ups", "evidence"];

let serverProcess = null;
let agentA = null;
let agentB = null;
let idsA = {};
let idsB = {};

function sessionCookie({ setCookies }) {
  for (const line of setCookies) {
    const pair = line.split(";")[0];
    if (pair.startsWith("better-auth.session_token=")) return pair;
  }
  return null;
}

async function api(pathname, { method = "GET", cookie, body } = {}) {
  const headers = { origin: BASE_URL };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(BASE_URL + pathname, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {}
  }
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, data, setCookies };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("server did not become ready");
}

function drain(stream) {
  stream.on("data", () => {});
  stream.on("error", () => {});
}

async function createAgent(label) {
  const email = `${RUN_ID}-${label}@example.com`;
  const signUp = await api("/api/auth/sign-up/email", {
    method: "POST",
    body: { name: `Agente ${label}`, email, password: PASSWORD },
  });
  const userId = signUp.data?.user?.id;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`UPDATE "User" SET "emailVerified" = true WHERE "id" = $1`, [userId]);
  } finally {
    await pool.end();
  }
  const signIn = await api("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password: PASSWORD },
  });
  const cookie = sessionCookie(signIn);
  const company = await api("/api/company", {
    method: "POST",
    cookie,
    body: { name: `Empresa ${label}` },
  });
  return {
    cookie,
    userId,
    companyId: company.data?.company?.id,
    email,
    password: PASSWORD,
  };
}

async function createEntitySet(agent, prefix) {
  const crmCompany = await api("/api/crm/companies", {
    method: "POST",
    cookie: agent.cookie,
    body: { name: `${prefix} Comercial ABC Ltda`, website: `https://${prefix}.example.com` },
  });
  assert.equal(crmCompany.status, 201, `${prefix}: create CrmCompany`);
  const crmCompanyId = crmCompany.data.data.id;

  const contact = await api("/api/crm/contacts", {
    method: "POST",
    cookie: agent.cookie,
    body: {
      companyId: "00000000-0000-0000-0000-000000000000",
      firstName: `${prefix} Ana`,
      lastName: "Perez",
      email: `${prefix}-contact@example.com`,
      title: "Director",
      crmCompanyId,
    },
  });
  assert.equal(contact.status, 201, `${prefix}: create Contact`);
  assert.notEqual(
    contact.data.data.companyId,
    "00000000-0000-0000-0000-000000000000",
    `${prefix}: spoofed companyId ignored`,
  );
  const contactId = contact.data.data.id;

  const lead = await api("/api/crm/leads", {
    method: "POST",
    cookie: agent.cookie,
    body: { firstName: `${prefix} Luis`, email: `${prefix}-lead@example.com`, status: "OPEN", crmCompanyId },
  });
  assert.equal(lead.status, 201, `${prefix}: create Lead`);
  const leadId = lead.data.data.id;

  const deal = await api("/api/crm/deals", {
    method: "POST",
    cookie: agent.cookie,
    body: {
      name: `${prefix} Negocio piloto`,
      amount: 12000,
      currency: "BRL",
      stage: "CONTRACT_SENT",
      crmCompanyId,
      contactId,
    },
  });
  assert.equal(deal.status, 201, `${prefix}: create Deal`);
  const dealId = deal.data.data.id;

  const activity = await api("/api/crm/activities", {
    method: "POST",
    cookie: agent.cookie,
    body: {
      type: "NOTE",
      subject: `${prefix} Reunion inicial`,
      body: "Primer contacto",
      contactId,
      dealId,
      meta: { channel: "telefono" },
    },
  });
  assert.equal(activity.status, 201, `${prefix}: create Activity`);
  const activityId = activity.data.data.id;

  const followUp = await api("/api/crm/follow-ups", {
    method: "POST",
    cookie: agent.cookie,
    body: {
      scheduledAt: "2026-09-20T10:00:00Z",
      note: `${prefix} Llamar de nuevo`,
      contactId,
      dealId,
    },
  });
  assert.equal(followUp.status, 201, `${prefix}: create FollowUp`);
  const followUpId = followUp.data.data.id;

  const evidence = await api("/api/crm/evidence", {
    method: "POST",
    cookie: agent.cookie,
    body: {
      kind: "EMAIL",
      title: `${prefix} Propuesta enviada`,
      url: `https://${prefix}.example.com/facturas.pdf`,
      contactId,
      dealId,
    },
  });
  assert.equal(evidence.status, 201, `${prefix}: create Evidence`);
  const evidenceId = evidence.data.data.id;

  return { crmCompanyId, contactId, leadId, dealId, activityId, followUpId, evidenceId };
}
before(async () => {
  serverProcess = spawn(process.execPath, ["api/dist/server.js"], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(PORT), BETTER_AUTH_URL: BASE_URL },
    stdio: ["ignore", "pipe", "pipe"],
  });
  drain(serverProcess.stdout);
  drain(serverProcess.stderr);
  await waitForServer();

  agentA = await createAgent("a");
  agentB = await createAgent("b");
  assert.ok(agentA.userId && agentA.companyId, "agent A has user and company");
  assert.ok(agentB.userId && agentB.companyId, "agent B has user and company");
  assert.notEqual(agentA.companyId, agentB.companyId, "agents belong to different tenants");
});

after(async () => {
  if (serverProcess) {
    serverProcess.kill();
    try {
      await serverProcess.status;
    } catch {}
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (agentA?.companyId) await pool.query(`DELETE FROM "Company" WHERE "id" = $1`, [agentA.companyId]);
    if (agentB?.companyId) await pool.query(`DELETE FROM "Company" WHERE "id" = $1`, [agentB.companyId]);
    if (agentA?.userId) await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [agentA.userId]);
    if (agentB?.userId) await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [agentB.userId]);
  } finally {
    await pool.end();
  }
});

test("authentication: unauthenticated CRM requests return 401", async () => {
  const list = await api("/api/crm/companies");
  assert.equal(list.status, 401);
  const create = await api("/api/crm/contacts", { method: "POST", body: { firstName: "X" } });
  assert.equal(create.status, 401);
});

test("crud: tenant A creates all entities and tenant B creates its own", async () => {
  idsA = await createEntitySet(agentA, "alfa");
  idsB = await createEntitySet(agentB, "beta");
  assert.equal(idsA.crmCompanyId.length > 0, true);
  assert.equal(idsB.crmCompanyId.length > 0, true);
});

test("validation: bad payloads are rejected", async () => {
  const missingName = await api("/api/crm/companies", {
    method: "POST",
    cookie: agentA.cookie,
    body: { website: "https://x.com" },
  });
  assert.equal(missingName.status, 400);

  const badEnum = await api("/api/crm/leads", {
    method: "POST",
    cookie: agentA.cookie,
    body: { firstName: "X", status: "INVENTADO" },
  });
  assert.equal(badEnum.status, 400);

  const wrongJson = await api("/api/crm/deals", {
    method: "POST",
    cookie: agentA.cookie,
    body: { name: "X", amount: "no-un-numero" },
  });
  assert.equal(wrongJson.status, 400);

  const emptyUpdate = await api(`/api/crm/contacts/${idsA.contactId}`, {
    method: "PATCH",
    cookie: agentA.cookie,
    body: {},
  });
  assert.equal(emptyUpdate.status, 400);

  const crossTenantRef = await api("/api/crm/leads", {
    method: "POST",
    cookie: agentA.cookie,
    body: { firstName: "X", crmCompanyId: idsB.crmCompanyId },
  });
  assert.equal(crossTenantRef.status, 422, "reference to another tenant is rejected");
});
test("list: returns only the records of the authenticated tenant", async () => {
  const keyOf = (entity) => ({
    companies: "crmCompanyId",
    contacts: "contactId",
    leads: "leadId",
    deals: "dealId",
    activities: "activityId",
    "follow-ups": "followUpId",
    evidence: "evidenceId",
  })[entity];
  for (const entity of ENTITIES) {
    const listA = await api(`/api/crm/${entity}`, { cookie: agentA.cookie });
    assert.equal(listA.status, 200);
    const listB = await api(`/api/crm/${entity}`, { cookie: agentB.cookie });
    assert.equal(listB.status, 200);
    assert.equal(listA.data.data.some((row) => row.id === idsA[keyOf(entity)]), true, `A sees its own ${entity}`);
    assert.equal(listA.data.data.some((row) => row.id === idsB[keyOf(entity)]), false, `A does not see B ${entity}`);
    assert.equal(listB.data.data.some((row) => row.id === idsA[keyOf(entity)]), false, `B does not see A ${entity}`);
  }
});

test("read: get by id works for the owner tenant", async () => {
  const checks = [
    ["/api/crm/companies", idsA.crmCompanyId],
    ["/api/crm/contacts", idsA.contactId],
    ["/api/crm/leads", idsA.leadId],
    ["/api/crm/deals", idsA.dealId],
    ["/api/crm/activities", idsA.activityId],
    ["/api/crm/follow-ups", idsA.followUpId],
    ["/api/crm/evidence", idsA.evidenceId],
  ];
  for (const [collection, id] of checks) {
    const res = await api(`${collection}/${id}`, { cookie: agentA.cookie });
    assert.equal(res.status, 200, `get ${collection}/${id}`);
    assert.equal(res.data.data.id, id);
  }
});

test("update: owner tenant can update records", async () => {
  const deal = await api(`/api/crm/deals/${idsA.dealId}`, {
    method: "PATCH",
    cookie: agentA.cookie,
    body: { stage: "CLOSED_WON", amount: 15000 },
  });
  assert.equal(deal.status, 200);
  assert.equal(deal.data.data.stage, "CLOSED_WON");
  assert.equal(deal.data.data.amount, "15000");

  const contact = await api(`/api/crm/contacts/${idsA.contactId}`, {
    method: "PATCH",
    cookie: agentA.cookie,
    body: { phone: "+54 11 5555 0000" },
  });
  assert.equal(contact.status, 200);
  assert.equal(contact.data.data.phone, "+54 11 5555 0000");
});

test("delete: blocked when the record has children", async () => {
  const contact = await api(`/api/crm/contacts/${idsA.contactId}`, {
    method: "DELETE",
    cookie: agentA.cookie,
  });
  assert.equal(contact.status, 409, "contact with activities cannot be deleted");

  const deal = await api(`/api/crm/deals/${idsA.dealId}`, {
    method: "DELETE",
    cookie: agentA.cookie,
  });
  assert.equal(deal.status, 409, "deal with activities cannot be deleted");

  const company = await api(`/api/crm/companies/${idsA.crmCompanyId}`, {
    method: "DELETE",
    cookie: agentA.cookie,
  });
  assert.equal(company.status, 409, "CrmCompany with contacts cannot be deleted");
});

test("delete: allowed for leaf records", async () => {
  const followUp = await api(`/api/crm/follow-ups/${idsA.followUpId}`, {
    method: "DELETE",
    cookie: agentA.cookie,
  });
  assert.equal(followUp.status, 200, "FollowUp is deletable");

  const gone = await api(`/api/crm/follow-ups/${idsA.followUpId}`, { cookie: agentA.cookie });
  assert.equal(gone.status, 404);
});

test("method: unsupported methods return 405", async () => {
  const deleteCollection = await api("/api/crm/companies", { method: "DELETE", cookie: agentA.cookie });
  assert.equal(deleteCollection.status, 405);

  const postToItem = await api(`/api/crm/contacts/${idsA.contactId}`, {
    method: "POST",
    cookie: agentA.cookie,
    body: {},
  });
  assert.equal(postToItem.status, 405);
});

test("isolation: tenant B cannot access tenant A records by id", async () => {
  const aRecords = [
    ["/api/crm/companies", idsA.crmCompanyId],
    ["/api/crm/contacts", idsA.contactId],
    ["/api/crm/leads", idsA.leadId],
    ["/api/crm/deals", idsA.dealId],
    ["/api/crm/activities", idsA.activityId],
    ["/api/crm/evidence", idsA.evidenceId],
  ];
  for (const [collection, id] of aRecords) {
    const get = await api(`${collection}/${id}`, { cookie: agentB.cookie });
    assert.equal(get.status, 404, `B cannot GET A ${collection}/${id}`);
    const patch = await api(`${collection}/${id}`, { method: "PATCH", cookie: agentB.cookie, body: { name: "X" } });
    assert.equal(patch.status, 404, `B cannot PATCH A ${collection}/${id}`);
    const del = await api(`${collection}/${id}`, { method: "DELETE", cookie: agentB.cookie });
    assert.equal(del.status, 404, `B cannot DELETE A ${collection}/${id}`);
  }

  const aStill = await api(`/api/crm/contacts/${idsA.contactId}`, { cookie: agentA.cookie });
  assert.equal(aStill.status, 200, "A still owns its contact");

  const aAparte = await api(`/api/crm/contacts/${idsB.contactId}`, { cookie: agentA.cookie });
  assert.equal(aAparte.status, 404, "A cannot read B contact either");
});