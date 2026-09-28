const KIB = 1024;
const SECOND_MS = 1000;

export const META = {
  webhook: {
    path: "/api/webhooks/meta",
    maxBodyBytes: 1024 * KIB,
    signatureHeader: "x-hub-signature-256",
    signaturePrefix: "sha256=",
    logPrefix: "[Meta Webhook]",
  },
  timestamp: {
    secondsThreshold: 1_000_000_000_000,
    secondMs: SECOND_MS,
  },
  instagram: {
    object: "instagram",
    messagesField: "messages",
  },
} as const;

export function metaSecrets(): string[] {
  return [process.env.META_APP_SECRET, process.env.INSTAGRAM_APP_SECRET]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

export function metaVerifyToken(): string | null {
  const token = process.env.META_VERIFY_TOKEN?.trim();
  return token ? token : null;
}
