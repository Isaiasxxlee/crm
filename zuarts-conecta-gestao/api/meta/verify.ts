import { createHmac, timingSafeEqual } from "node:crypto";
import { META } from "./config.js";

export type ChallengeResult = { ok: true; challenge: string } | { ok: false; status: number; error: string };

export function verifyChallenge(url: URL, expectedToken: string | null): ChallengeResult {
  if (!expectedToken) return { ok: false, status: 503, error: "webhook_not_configured" };
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !challenge) return { ok: false, status: 400, error: "invalid_verification_request" };
  if (!token || !safeEqual(token, expectedToken)) return { ok: false, status: 403, error: "invalid_verify_token" };
  return { ok: true, challenge };
}

export function validSignature(body: Buffer, header: string | undefined, secrets: readonly string[]): boolean {
  const prefix = META.webhook.signaturePrefix;
  if (!header || !header.startsWith(prefix)) return false;
  const received = header.slice(prefix.length).trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  return secrets.some((secret) => safeEqual(createHmac("sha256", secret).update(body).digest("hex"), received));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
