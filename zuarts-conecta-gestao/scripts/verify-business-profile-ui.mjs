import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const browserPath = process.argv[2];
if (!browserPath) throw new Error("Pass the Chrome or Chromium executable as the first argument.");
const directory = await mkdtemp(path.join(tmpdir(), "zuarts-profile-ui-"));
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = path.join(process.cwd(), "web", pathname === "/" ? "index.html" : pathname);
    const body = await readFile(file);
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
    res.setHeader("content-type", types[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(browserPath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${directory}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let socket;
try {
  let endpoint;
  let stderr = "";
  browser.stderr.on("data", (chunk) => {
    stderr += chunk;
    endpoint = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
  });
  await until(() => endpoint);
  const host = new URL(endpoint).host;
  const tabs = await (await fetch(`http://${host}/json/list`)).json();
  socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await once(socket, "open");
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(${mockApi.toString()})()` });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base });
  await until(() => evaluate('document.body?.dataset.authState === "authenticated"'));
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const visibleText = () => evaluate('document.getElementById("module-business-profile").innerText');
  await click('.sidebar-nav [data-module="business-profile"]');
  await until(() => evaluate('!!document.querySelector("input[name=segmentId]")'));
  await click('input[value="pet"]');
  await until(() => evaluate('!!document.querySelector("input[value=petshop]")'));
  await click('input[value="petshop"]');
  await until(() => evaluate('!document.getElementById("module-business-profile").hasAttribute("aria-busy")'));
  assert.equal(await evaluate('document.querySelectorAll("input[name=specialtyId]").length'), 0);
  assert.match(await visibleText(), /Não se aplica/);
  await click('#module-business-profile button[type="submit"]');
  await until(() => evaluate('document.querySelector("[data-profile-status]").textContent === "Perfil salvo."'));
  assert.match(await visibleText(), /Editar Perfil/);
  assert.equal(await evaluate('window.profileMock.saved.businessTypeId'), "petshop");
  await click('[data-profile-content] > button');
  await until(() => evaluate('!!document.querySelector("input[name=segmentId]")'));
  await click('input[value="health"]');
  await until(() => evaluate('!!document.querySelector("input[value=clinic]")'));
  await click('input[value="clinic"]');
  await until(() => evaluate('!!document.querySelector("input[value=psychology]")'));
  await click('input[value="psychology"]');
  await evaluate('window.profileMock.fail = true');
  await click('#module-business-profile button[type="submit"]');
  await until(() => evaluate('!document.querySelector("[data-profile-retry]").hidden'));
  assert.match(await visibleText(), /Não foi possível/);
  assert.equal(await evaluate('document.querySelector("input[value=psychology]").checked'), true);
  await click('[data-profile-retry]');
  await until(() => evaluate('!document.querySelector(".profile-editor")'));
  assert.match(await visibleText(), /Psicologia/);
  await click('.sidebar-nav [data-module="dashboard"]');
  assert.equal(await evaluate('document.getElementById("module-dashboard").hidden'), false);
  await click('.sidebar-nav [data-module="business-profile"]');
  await until(async () => /Psicologia/.test(await visibleText()));
  await send("Page.reload");
  await until(() => evaluate('document.body?.dataset.authState === "authenticated"'));
  await click('.sidebar-nav [data-module="business-profile"]');
  await until(async () => /Psicologia/.test(await visibleText()));
  await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "desktop.png"), Buffer.from(data, "base64")));
  await click('[data-profile-content] > button');
  await until(() => evaluate('!!document.querySelector("input[name=segmentId]")'));
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
  await evaluate('document.documentElement.dataset.theme = "dark"');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".profile-summary h3")).color'), "rgb(238, 242, 251)");
  assert.equal(await evaluate('getComputedStyle(document.getElementById("dash-header-title")).color'), "rgb(238, 242, 251)");
  await evaluate('document.querySelector("input[value=health]").focus()');
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
  await until(() => evaluate('!!document.querySelector("input[value=petshop]")'));
  assert.equal(await evaluate('document.querySelectorAll("input[name=specialtyId]").length'), 0);
  await until(() => evaluate('document.getElementById("sidebar").getBoundingClientRect().right <= 0'));
  await send("Page.captureScreenshot").then(({ data }) => writeFile(path.join(directory, "mobile-dark.png"), Buffer.from(data, "base64")));
  assert.deepEqual(errors, []);
  console.log("UI passes: create, edit, optional specialty, save failure, retry, reload, dashboard, keyboard, 320px, dark mode.");
  console.log(`Screenshots: ${directory}`);
} finally {
  socket?.close();
  browser.kill();
  server.close();
}

async function until(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Browser check timed out.");
}

function mockApi() {
  const segments = [{ id: "pet", name: "Pet" }, { id: "health", name: "Saúde" }];
  const types = [{ id: "petshop", name: "Pet Shop", segmentId: "pet" }, { id: "clinic", name: "Clínica", segmentId: "health" }];
  const specialties = [{ id: "psychology", name: "Psicologia", businessTypeId: "clinic" }];
  window.profileMock = { saved: JSON.parse(sessionStorage.getItem("profile-test") || "null"), fail: false };
  const original = window.fetch;
  window.fetch = async (url, options = {}) => {
    if (!String(url).startsWith("/api/")) return original(url, options);
    const parsed = new URL(url, location.origin);
    if (parsed.pathname === "/api/me") return Response.json({ user: { name: "Teste", id: "user" }, company: { name: "Empresa de teste" }, role: "OWNER" });
    if (parsed.pathname.endsWith("/segments")) return Response.json({ data: segments });
    if (parsed.pathname.endsWith("/types")) return Response.json({ data: types.filter((type) => type.segmentId === parsed.searchParams.get("segmentId")) });
    if (parsed.pathname.endsWith("/specialties")) return Response.json({ data: specialties.filter((item) => item.businessTypeId === parsed.searchParams.get("businessTypeId")) });
    if (window.profileMock.fail) {
      window.profileMock.fail = false;
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
    if (options.method === "PUT") {
      const body = JSON.parse(options.body);
      const type = types.find((item) => item.id === body.businessTypeId);
      window.profileMock.saved = { ...body, businessType: { ...type, segment: segments.find((item) => item.id === type.segmentId) }, specialty: specialties.find((item) => item.id === body.specialtyId) || null };
      sessionStorage.setItem("profile-test", JSON.stringify(window.profileMock.saved));
    }
    return Response.json({ data: window.profileMock.saved });
  };
}
