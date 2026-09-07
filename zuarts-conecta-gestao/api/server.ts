import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { prisma } from "./db.js";
import { authenticateUser, ensureCompany, findContext } from "./tenant.js";

const port = Number(process.env.PORT ?? 3001);
const distDir = path.resolve(process.cwd(), "dist");
const webDir = path.join(distDir, "web");
const indexPath = path.join(webDir, "index.html");

const authHandler = toNodeHandler(auth);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/auth/")) {
    await authHandler(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "zuarts-sistema-de-gestao-api" });
    return;
  }

  if (req.method === "GET" && pathname === "/health/db") {
    prismaPing(res);
    return;
  }

  if (pathname === "/api/me" && req.method === "GET") {
    await handleMe(req, res);
    return;
  }

  if (pathname === "/api/company" && req.method === "POST") {
    await handleCompany(req, res);
    return;
  }

  if (req.method === "GET") {
    const assetPath = pathname === "/" ? indexPath : path.join(webDir, pathname);
    readFile(assetPath)
      .then((body) => {
        sendBytes(res, 200, contentType(assetPath), body);
      })
      .catch(() => {
        sendJson(res, 404, { ok: false, error: "not_found" });
      });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
});

server.listen(port, "0.0.0.0");

async function handleMe(req: IncomingMessage, res: ServerResponse) {
  const user = await authenticateUser(req.headers);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  const context = await findContext(user.id);
  sendJson(res, 200, {
    ok: true,
    user,
    company: context?.company,
    role: context?.role,
  });
}

async function handleCompany(req: IncomingMessage, res: ServerResponse) {
  const user = await authenticateUser(req.headers);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }
  const body = await readJson(req);
  const companyName = typeof body?.name === "string" ? body.name : undefined;
  const context = await ensureCompany(user.id, companyName);
  sendJson(res, 200, {
    ok: true,
    company: context?.company,
    role: context?.role,
  });
}

function prismaPing(res: ServerResponse) {
  prisma.$queryRaw`SELECT 1`
    .then(() => {
      sendJson(res, 200, { ok: true, database: "postgresql" });
    })
    .catch(() => {
      sendJson(res, 503, { ok: false, error: "database_unavailable" });
    });
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf-8").replace(/^\uFEFF/, "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  sendBytes(res, status, "application/json; charset=utf-8", Buffer.from(JSON.stringify(body)));
}

function sendBytes(res: ServerResponse, status: number, type: string, body: Uint8Array) {
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(body) });
  res.end(body);
}

function contentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}
