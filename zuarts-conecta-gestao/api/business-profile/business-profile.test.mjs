import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";
import { once } from "node:events";
import { profileScenarios } from "./scenarios.mjs";

const projectDir = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 35000 + Math.floor(Math.random() * 4000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const RUN_ID = `profile${Date.now()}${Math.floor(Math.random() * 100000)}`;

const PASSWORD = "Test-Password-123";

let serverProcess = null;
let agentA = null;
let agentB = null;

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
    } catch {
      data = {};
    }
  }
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, data, setCookies };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 200) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }
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
    const exited = once(serverProcess, "exit");
    serverProcess.kill();
    await exited;
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


test("business profile integration", async (t) => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await profileScenarios(t, api, agentA, agentB, pool);
  } finally {
    await pool.end();
  }
});
