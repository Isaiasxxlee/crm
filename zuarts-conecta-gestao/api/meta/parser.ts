import { z } from "zod";
import { META } from "./config.js";
import type { ParsedWebhook } from "./event.js";
import { parseInstagramEntries } from "./instagram.js";

const envelope = z.object({
  object: z.string().trim().min(1),
  entry: z.array(z.unknown()),
});

export function parseMetaWebhook(body: unknown): ParsedWebhook {
  const parsed = envelope.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid_payload" };
  const { object, entry } = parsed.data;
  if (object === META.instagram.object) {
    return { ok: true, object, ...parseInstagramEntries(entry) };
  }
  return { ok: true, object, events: [], ignored: entry.length };
}
