import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const projectDir = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 34000 + Math.floor(Math.random() * 4000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const RUN_ID = `meta${Date.now()}${Math.floor(Math.random() * 100000)}`;
const PASSWORD = "Test-Password-123";
const VERIFY_TOKEN = `verify-${RUN_ID}`;
const APP_SECRET = `secret-${RUN_ID}`;
const ACCOUNT_A = `1784${Date.now()}`;
const ACCOUNT_B = `1785${Date.now()}`;
const CUSTOMER = `9${Date.now()}`;

let serverProcess = null;
let agentA = null;
let agentB = null;
let conversationId = null;

async function api(pathname, { method = "GET", cookie, body, headers = {} } = {}) {
  const init = { method, headers: { origin: BASE_URL, ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(BASE_URL + pathname, init);
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, data, setCookies };
}

function sign(raw, secret = APP_SECRET) {
  return `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
}

function webhook(payload, { secret = APP_SECRET, signature } = {}) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return api("/api/webhooks/meta", {
    method: "POST",
    body: raw,
    headers: { "x-hub-signature-256": signature ?? sign(raw, secret) },
  });
}

function instagramEvent({ account = ACCOUNT_A, customer = CUSTOMER, mid, text = "Olá, quero informações", echo = false, timestamp = Date.now() }) {
  return {
    object: "instagram",
    entry: [
      {
        id: account,
        time: timestamp,
        messaging: [
          {
            sender: { id: echo ? account : customer },
            recipient: { id: echo ? customer : account },
            timestamp,
            message: { mid, text, ...(echo ? { is_echo: true } : {}) },
          },
        ],
      },
    ],
  };
}

async function withPool(run) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const res = await fetch(`${BASE_URL}/health`).catch(() => null);
    if (res?.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("server did not become ready");
}

async function createAgent(label) {
  const email = `${RUN_ID}-${label}@example.com`;
  const signUp = await api("/api/auth/sign-up/email", {
    method: "POST",
    body: { name: `Agente ${label}`, email, password: PASSWORD },
  });
  const userId = signUp.data?.user?.id;
  await withPool((pool) => pool.query(`UPDATE "User" SET "emailVerified" = true WHERE "id" = $1`, [userId]));
  const signIn = await api("/api/auth/sign-in/email", { method: "POST", body: { email, password: PASSWORD } });
  const cookie = signIn.setCookies.map((line) => line.split(";")[0]).find((pair) => pair.startsWith("better-auth.session_token="));
  const company = await api("/api/company", { method: "POST", cookie, body: { name: `Empresa ${label}` } });
  return { cookie, userId, companyId: company.data?.company?.id };
}

async function registerChannel(companyId, externalId) {
  await withPool((pool) =>
    pool.query(
      `INSERT INTO "Channel" ("id", "companyId", "type", "name", "externalId", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'INSTAGRAM', $2, $3, now())`,
      [companyId, `Instagram ${externalId}`, externalId],
    ),
  );
}

async function messageCount(companyId) {
  const result = await withPool((pool) => pool.query(`SELECT count(*)::int AS n FROM "Message" WHERE "companyId" = $1`, [companyId]));
  return result.rows[0].n;
}

before(async () => {
  serverProcess = spawn(process.execPath, ["api/dist/server.js"], {
    cwd: projectDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      BETTER_AUTH_URL: BASE_URL,
      META_VERIFY_TOKEN: VERIFY_TOKEN,
      META_APP_SECRET: APP_SECRET,
      INSTAGRAM_APP_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", () => {});
  serverProcess.stderr.on("data", () => {});
  await waitForServer();
  agentA = await createAgent("a");
  agentB = await createAgent("b");
  assert.ok(agentA.companyId && agentB.companyId, "both tenants exist");
  await registerChannel(agentA.companyId, ACCOUNT_A);
  await registerChannel(agentB.companyId, ACCOUNT_B);
});

after(async () => {
  if (serverProcess) {
    serverProcess.kill();
    if (serverProcess.exitCode === null) await new Promise((resolve) => serverProcess.once("exit", resolve));
  }
  await withPool(async (pool) => {
    for (const agent of [agentA, agentB]) {
      if (agent?.companyId) await pool.query(`DELETE FROM "Company" WHERE "id" = $1`, [agent.companyId]);
      if (agent?.userId) await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [agent.userId]);
    }
  });
});

test("verification: GET with the correct token returns the challenge", async () => {
  const res = await api(`/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1158201444`);
  assert.equal(res.status, 200);
  assert.equal(res.data, 1158201444);
});

test("verification: GET with a wrong token is refused", async () => {
  const res = await api("/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42");
  assert.equal(res.status, 403);
  assert.equal(res.data.error, "invalid_verify_token");
});

test("signature: POST with a wrong signature is refused and saves nothing", async () => {
  const res = await webhook(instagramEvent({ mid: `${RUN_ID}-forged` }), { secret: "not-the-secret" });
  assert.equal(res.status, 401);
  const missing = await webhook(instagramEvent({ mid: `${RUN_ID}-unsigned` }), { signature: "" });
  assert.equal(missing.status, 401);
  assert.equal(await messageCount(agentA.companyId), 0);
});

test("payload: invalid JSON and invalid envelope return 400", async () => {
  const badJson = await webhook("{not json");
  assert.equal(badJson.status, 400);
  assert.equal(badJson.data.error, "invalid_json");
  const badEnvelope = await webhook({ hello: "world" });
  assert.equal(badEnvelope.status, 400);
  assert.equal(badEnvelope.data.error, "invalid_payload");
});

test("event: a valid Instagram message creates a conversation and a message", async () => {
  const res = await webhook(instagramEvent({ mid: `${RUN_ID}-m1`, timestamp: 1_790_000_000_000 }));
  assert.equal(res.status, 200);
  assert.equal(res.data.saved, 1);

  const list = await api("/api/inbox/conversations", { cookie: agentA.cookie });
  assert.equal(list.status, 200);
  assert.equal(list.data.data.length, 1);
  const conversation = list.data.data[0];
  conversationId = conversation.id;
  assert.equal(conversation.channel.type, "INSTAGRAM");
  assert.equal(conversation.externalConversationId, CUSTOMER);
  assert.equal(conversation.messageCount, 1);
  assert.equal(conversation.lastMessage.text, "Olá, quero informações");
  assert.equal(conversation.lastMessage.direction, "INBOUND");
  assert.equal(new Date(conversation.lastMessageAt).getTime(), 1_790_000_000_000);

  const detail = await api(`/api/inbox/conversations/${conversationId}`, { cookie: agentA.cookie });
  assert.equal(detail.status, 200);
  assert.equal(detail.data.data.id, conversationId);

  const messages = await api(`/api/inbox/conversations/${conversationId}/messages`, { cookie: agentA.cookie });
  assert.equal(messages.status, 200);
  assert.equal(messages.data.data.length, 1);
  assert.equal(messages.data.data[0].messageType, "TEXT");
  assert.equal(messages.data.data[0].senderExternalId, CUSTOMER);
});

test("idempotency: the same event delivered twice creates one message", async () => {
  const res = await webhook(instagramEvent({ mid: `${RUN_ID}-m1`, timestamp: 1_790_000_000_000 }));
  assert.equal(res.status, 200);
  assert.equal(res.data.saved, 0);
  assert.equal(res.data.duplicate, 1);
  assert.equal(await messageCount(agentA.companyId), 1);
});

test("conversation: an existing conversation receives new messages in order", async () => {
  const reply = await webhook(
    instagramEvent({ mid: `${RUN_ID}-m2`, text: "Olá! Como podemos ajudar?", echo: true, timestamp: 1_790_000_060_000 }),
  );
  assert.equal(reply.data.saved, 1);
  const image = instagramEvent({ mid: `${RUN_ID}-m3`, text: "", timestamp: 1_790_000_120_000 });
  image.entry[0].messaging[0].message.attachments = [{ type: "image", payload: { url: "https://example.com/a.jpg" } }];
  delete image.entry[0].messaging[0].message.text;
  assert.equal((await webhook(image)).data.saved, 1);

  const list = await api("/api/inbox/conversations", { cookie: agentA.cookie });
  assert.equal(list.data.data.length, 1, "still one conversation");
  assert.equal(list.data.data[0].id, conversationId);
  assert.equal(list.data.data[0].messageCount, 3);

  const messages = await api(`/api/inbox/conversations/${conversationId}/messages`, { cookie: agentA.cookie });
  const rows = messages.data.data;
  assert.deepEqual(rows.map((row) => row.direction), ["INBOUND", "OUTBOUND", "INBOUND"]);
  assert.deepEqual(rows.map((row) => row.messageType), ["TEXT", "TEXT", "IMAGE"]);
  assert.equal(rows[1].senderExternalId, ACCOUNT_A);
});

test("dashboard test payload: the changes[field=messages] shape is accepted", async () => {
  const payload = {
    object: "instagram",
    entry: [
      {
        id: "0",
        time: 1790000180,
        changes: [
          {
            field: "messages",
            value: {
              sender: { id: CUSTOMER },
              recipient: { id: ACCOUNT_A },
              timestamp: "1790000180",
              message: { mid: `${RUN_ID}-m4`, text: "Mensagem de teste do painel" },
            },
          },
        ],
      },
    ],
  };
  const res = await webhook(payload);
  assert.equal(res.status, 200);
  assert.equal(res.data.saved, 1);
});

test("isolation: tenant B never sees tenant A conversations", async () => {
  const list = await api("/api/inbox/conversations", { cookie: agentB.cookie });
  assert.equal(list.status, 200);
  assert.equal(list.data.data.length, 0);
  const detail = await api(`/api/inbox/conversations/${conversationId}`, { cookie: agentB.cookie });
  assert.equal(detail.status, 404);
  const messages = await api(`/api/inbox/conversations/${conversationId}/messages`, { cookie: agentB.cookie });
  assert.equal(messages.status, 404);

  const own = await webhook(instagramEvent({ account: ACCOUNT_B, mid: `${RUN_ID}-b1`, text: "Oi B" }));
  assert.equal(own.data.saved, 1);
  const listB = await api("/api/inbox/conversations", { cookie: agentB.cookie });
  assert.equal(listB.data.data.length, 1);
  assert.equal(listB.data.data[0].lastMessage.text, "Oi B");
  const listA = await api("/api/inbox/conversations", { cookie: agentA.cookie });
  assert.ok(listA.data.data.every((conversation) => conversation.lastMessage.text !== "Oi B"));
});

test("auth: inbox routes require a session", async () => {
  const res = await api("/api/inbox/conversations");
  assert.equal(res.status, 401);
  const invalid = await api("/api/inbox/conversations/not-a-uuid", { cookie: agentA.cookie });
  assert.equal(invalid.status, 400);
});

test("robustness: unknown payloads are acknowledged and the server keeps running", async () => {
  const unregistered = await webhook(instagramEvent({ account: `999${Date.now()}`, mid: `${RUN_ID}-x1` }));
  assert.equal(unregistered.status, 200);
  assert.equal(unregistered.data.channel_not_found, 1);

  const otherObject = await webhook({ object: "page", entry: [{ id: "1", messaging: [] }] });
  assert.equal(otherObject.status, 200);
  assert.equal(otherObject.data.ignored, 1);

  const reaction = await webhook({
    object: "instagram",
    entry: [
      { id: ACCOUNT_A, messaging: [{ sender: { id: CUSTOMER }, recipient: { id: ACCOUNT_A }, reaction: { mid: "x", action: "react" } }] },
      "not-an-entry",
      { id: ACCOUNT_A, messaging: [{ sender: {}, message: 42 }] },
    ],
  });
  assert.equal(reaction.status, 200);
  assert.equal(reaction.data.received, 0);
  assert.equal(reaction.data.ignored, 3);

  const health = await api("/health");
  assert.equal(health.status, 200);
});
