import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../crm/http.js";
import { META, metaSecrets, metaVerifyToken } from "./config.js";
import { parseMetaWebhook } from "./parser.js";
import { storeMessageEvent, type StoreOutcome } from "./store.js";
import { validSignature, verifyChallenge } from "./verify.js";

function log(message: string) {
  console.log(`${META.webhook.logPrefix} ${message}`);
}

export async function handleMetaWebhook(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (url.pathname !== META.webhook.path) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return;
  }
  if (req.method === "GET") {
    handleVerification(res, url);
    return;
  }
  if (req.method === "POST") {
    try {
      await handleEvent(req, res);
    } catch (error) {
      console.error(`${META.webhook.logPrefix} Falha ao processar evento: ${errorLabel(error)}`);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "internal_error" });
    }
    return;
  }
  sendJson(res, 405, { ok: false, error: "method_not_allowed" });
}

function handleVerification(res: ServerResponse, url: URL) {
  const result = verifyChallenge(url, metaVerifyToken());
  if (!result.ok) {
    log(`Verificação recusada: ${result.error}`);
    sendJson(res, result.status, { ok: false, error: result.error });
    return;
  }
  log("Verificação aceita");
  const body = Buffer.from(result.challenge);
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "content-length": body.length });
  res.end(body);
}

async function handleEvent(req: IncomingMessage, res: ServerResponse) {
  const secrets = metaSecrets();
  if (secrets.length === 0) {
    log("Evento recusado: META_APP_SECRET não configurado");
    sendJson(res, 503, { ok: false, error: "webhook_not_configured" });
    return;
  }
  const raw = await readRawBody(req, META.webhook.maxBodyBytes);
  if (!raw) {
    sendJson(res, 413, { ok: false, error: "payload_too_large" });
    return;
  }
  const signature = req.headers[META.webhook.signatureHeader];
  if (!validSignature(raw, Array.isArray(signature) ? signature[0] : signature, secrets)) {
    log("Evento recusado: assinatura inválida");
    sendJson(res, 401, { ok: false, error: "invalid_signature" });
    return;
  }
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf-8"));
  } catch {
    log("Evento recusado: JSON inválido");
    sendJson(res, 400, { ok: false, error: "invalid_json" });
    return;
  }
  const parsed = parseMetaWebhook(body);
  if (!parsed.ok) {
    log(`Evento recusado: ${parsed.error}`);
    sendJson(res, 400, { ok: false, error: parsed.error });
    return;
  }
  log(`Evento recebido: object=${parsed.object} mensagens=${parsed.events.length} ignorados=${parsed.ignored}`);

  const outcomes: Record<StoreOutcome, number> = { saved: 0, duplicate: 0, channel_not_found: 0, channel_disabled: 0 };
  for (const event of parsed.events) {
    outcomes[await storeMessageEvent(event, log)]++;
  }
  sendJson(res, 200, { ok: true, received: parsed.events.length, ignored: parsed.ignored, ...outcomes });
}

function errorLabel(error: unknown): string {
  if (typeof error !== "object" || error === null) return "unknown";
  const { code, name } = error as { code?: unknown; name?: unknown };
  return [name, code].filter((part) => typeof part === "string").join(" ") || "unknown";
}

async function readRawBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
