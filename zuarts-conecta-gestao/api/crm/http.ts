import type { IncomingMessage, ServerResponse } from "node:http";

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  sendBytes(res, status, "application/json; charset=utf-8", Buffer.from(JSON.stringify(body)));
}

export function sendBytes(res: ServerResponse, status: number, type: string, body: Uint8Array): void {
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(body) });
  res.end(body);
}

export function idFromPath(pathname: string, prefix: string): string | null {
  const rest = pathname.slice(prefix.length);
  if (!rest.startsWith("/")) return null;
  if (rest.includes("/", 1)) return null;
  const id = rest.slice(1);
  return id.length > 0 ? id : null;
}

export function sendPrismaError(res: ServerResponse, error: unknown): void {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === "P2002") {
    sendJson(res, 409, { ok: false, error: "duplicate_record" });
    return;
  }
  sendJson(res, 500, { ok: false, error: "internal_error" });
}
