import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import "dotenv/config";
import { until, withBrowser } from "./browser-session.mjs";

const base = "http://localhost:3001";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const email = `plans-ui-${randomUUID()}@example.com`;
const password = randomUUID();
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

try {
  const signUp = await api("/api/auth/sign-up/email", { name: "Verificação Planos", email, password });
  userId = signUp.data.user.id;
  await pool.query('UPDATE "User" SET "emailVerified" = true WHERE id = $1', [userId]);
  const signIn = await api("/api/auth/sign-in/email", { email, password });
  cookie = signIn.cookies.map((line) => line.split(";")[0]).find((line) => line.startsWith("better-auth.session_token="));
  assert.ok(cookie);
  companyId = (await api("/api/company", { name: "Empresa de verificação de planos" })).data.company.id;
  for (let index = 0; index < 8; index++) await api("/api/crm/contacts", { firstName: `Contato ${index}` });
  const plans = (await api("/api/plans")).data.data;
  const professional = plans.find((plan) => plan.slug === "profissional");
  const premium = plans.find((plan) => plan.slug === "premium");

  await withBrowser(process.argv[2], async ({ send, evaluate, directory, errors }) => {
    const split = cookie.indexOf("=");
    await send("Network.setCookie", { name: cookie.slice(0, split), value: cookie.slice(split + 1), url: base });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: base });
    await until(() => evaluate('document.body?.dataset.authState === "authenticated"'));
    assert.equal(await evaluate('document.getElementById("module-dashboard").hidden'), false);
    const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await click('.sidebar-nav [data-module="business-profile"]');
    await until(() => evaluate('!!document.querySelector("input[name=segmentId]")'));
    await click('[data-profile-page="plans"]');
    await until(() => evaluate('document.querySelectorAll(".plan-card").length === 3'));
    const text = () => evaluate('document.getElementById("profile-plans").innerText');
    assert.match(await text(), /8 de 10 clientes/);
    assert.match(await text(), /80% utilizado/);
    assert.match(await text(), /100,00/);
    assert.match(await text(), /Preço a definir/);
    assert.equal(await evaluate('document.querySelector(".plan-overview progress").value'), 80);
    await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "plans-desktop.png"), Buffer.from(data, "base64")));
    await click(`[data-plan-id="${professional.id}"] button`);
    await until(async () => (await text()).includes("Plano atual: Profissional"));
    assert.match(await text(), /8 de 30 clientes/);
    assert.equal((await api("/api/subscription")).data.data.plan.id, professional.id);
    await click(`[data-plan-id="${premium.id}"] button`);
    await until(async () => (await text()).includes("Plano atual: Premium"));
    assert.equal(await evaluate('document.querySelectorAll(".plan-overview progress").length'), 0);
    assert.match(await text(), /8 clientes · Sem limite superior/);
    await click('[data-profile-page="overview"]');
    await until(() => evaluate('!!document.querySelector("input[name=segmentId]")'));
    await click('[data-profile-page="plans"]');
    await until(async () => (await text()).includes("Plano atual: Premium"));
    await send("Page.reload");
    await until(() => evaluate('document.body?.dataset.authState === "authenticated"'));
    await click('.sidebar-nav [data-module="business-profile"]');
    await click('[data-profile-page="plans"]');
    await until(async () => (await text()).includes("Plano atual: Premium"));
    await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate('document.documentElement.dataset.theme = "dark"');
    await until(() => evaluate('document.getElementById("sidebar").getBoundingClientRect().right <= 0'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".plan-card h4")).color'), "rgb(238, 242, 251)");
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".plan-card .btn-blue")).color'), "rgb(255, 255, 255)");
    await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "plans-mobile-dark.png"), Buffer.from(data, "base64")));
    await click('.sidebar-nav [data-module="dashboard"]');
    assert.equal(await evaluate('document.getElementById("module-dashboard").hidden'), false);
    assert.deepEqual(errors, []);
    console.log("Live UI passes: Dashboard, profile, plans, actual counts, selection, persistence, 320px, dark mode, console.");
    console.log(`Screenshots: ${directory}`);
  });
} finally {
  if (companyId) await pool.query('DELETE FROM "Company" WHERE id = $1', [companyId]);
  if (userId) await pool.query('DELETE FROM "User" WHERE id = $1', [userId]);
  await pool.end();
}
