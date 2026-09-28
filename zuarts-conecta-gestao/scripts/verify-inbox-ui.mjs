import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import "dotenv/config";
import { until, withBrowser } from "./browser-session.mjs";

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const secret = process.env.META_APP_SECRET;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const email = `inbox-ui-${randomUUID()}@example.com`;
const password = randomUUID();
const account = `1786${Date.now()}`;
const customer = `8${Date.now()}`;
let userId;
let companyId;
let cookie;

async function api(url, body) {
  const response = await fetch(base + url, {
    method: body ? "POST" : "GET",
    headers: { origin: base, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(response.ok, `${url}: ${response.status}`);
  return { data: await response.json(), cookies: response.headers.getSetCookie() };
}

async function deliver(mid, text, timestamp) {
  const raw = JSON.stringify({
    object: "instagram",
    entry: [{ id: account, time: timestamp, messaging: [{ sender: { id: customer }, recipient: { id: account }, timestamp, message: { mid, text } }] }],
  });
  const response = await fetch(`${base}/api/webhooks/meta`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}` },
    body: raw,
  });
  assert.equal(response.status, 200, "webhook accepted");
  assert.equal((await response.json()).saved, 1, "message saved");
}

try {
  assert.ok(secret, "META_APP_SECRET must be set for the running server and for this script.");
  const signUp = await api("/api/auth/sign-up/email", { name: "Verificação Caixa", email, password });
  userId = signUp.data.user.id;
  await pool.query('UPDATE "User" SET "emailVerified" = true WHERE id = $1', [userId]);
  const signIn = await api("/api/auth/sign-in/email", { email, password });
  cookie = signIn.cookies.map((line) => line.split(";")[0]).find((line) => line.startsWith("better-auth.session_token="));
  assert.ok(cookie);
  companyId = (await api("/api/company", { name: "Empresa de verificação da caixa" })).data.company.id;
  await pool.query(
    `INSERT INTO "Channel" ("id", "companyId", "type", "name", "externalId", "updatedAt") VALUES ($1, $2, 'INSTAGRAM', 'Instagram de teste', $3, now())`,
    [randomUUID(), companyId, account],
  );
  const now = Date.now();
  await deliver(`ui-${randomUUID()}`, "Olá, vi o anúncio no Instagram", now - 60000);

  await withBrowser(process.argv[2], async ({ send, evaluate, directory, errors }) => {
    const split = cookie.indexOf("=");
    await send("Network.setCookie", { name: cookie.slice(0, split), value: cookie.slice(split + 1), url: base });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: base });
    await until(() => evaluate('document.body?.dataset.authState === "authenticated"'));
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const text = () => evaluate('document.getElementById("module-inbox").innerText');
    await click('.sidebar-nav [data-module="inbox"]');
    await until(() => evaluate('document.querySelectorAll(".inbox-conversation").length === 1'));
    assert.match(await text(), /Olá, vi o anúncio no Instagram/);
    assert.match(await text(), /Instagram/);
    await click(".inbox-conversation");
    await until(() => evaluate('document.querySelectorAll(".inbox-message").length === 1'));
    assert.match(await text(), /Cliente/);
    assert.match(await text(), /· 1 mensagem$/m);
    await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "inbox-desktop.png"), Buffer.from(data, "base64")));

    await deliver(`ui-${randomUUID()}`, "Qual o preço?", now);
    await click("[data-inbox-refresh]");
    await until(() => evaluate('document.querySelectorAll(".inbox-message").length === 2'));
    assert.match(await text(), /Qual o preço\?/);

    await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate('document.documentElement.dataset.theme = "dark"');
    await until(() => evaluate('document.getElementById("sidebar").getBoundingClientRect().right <= 0'));
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#module-inbox .dash-card h3")).color'), "rgb(238, 242, 251)");
    assert.equal(await evaluate('getComputedStyle(document.getElementById("dash-header-title")).color'), "rgb(238, 242, 251)");
    await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "inbox-mobile-dark.png"), Buffer.from(data, "base64")));
    await click('.sidebar-nav [data-module="dashboard"]');
    assert.equal(await evaluate('document.getElementById("module-inbox").hidden'), true);
    assert.deepEqual(errors, []);
    console.log("Live UI passes: webhook → banco → caixa de entrada, atualização, 320px, tema escuro, console.");
    console.log(`Screenshots: ${directory}`);
  });
} finally {
  if (companyId) await pool.query('DELETE FROM "Company" WHERE id = $1', [companyId]);
  if (userId) await pool.query('DELETE FROM "User" WHERE id = $1', [userId]);
  await pool.end();
}
