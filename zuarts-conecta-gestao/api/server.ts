import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(rootDir, "..", "..", "dist");
const webDir = path.join(distDir, "web");
const indexPath = path.join(webDir, "index.html");

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "zuarts-sistema-de-gestao-api" }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/health/db") {
    prisma.$queryRaw`SELECT 1`
      .then(() => {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, database: "postgresql" }));
      })
      .catch(() => {
        res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "database_unavailable" }));
      });
    return;
  }

  if (req.method === "GET") {
    const assetPath = url.pathname === "/" ? indexPath : path.join(webDir, url.pathname);

    readFile(assetPath)
      .then((body) => {
        res.writeHead(200, { "content-type": contentType(assetPath) });
        res.end(body);
      })
      .catch(() => {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "not_found" }));
      });
    return;
  }

  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.listen(port, "0.0.0.0");

function contentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}
