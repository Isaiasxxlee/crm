import { z } from "zod";

export const catalogId = z.uuid();
export const profileInput = z.object({
  segmentId: catalogId,
  businessTypeId: catalogId,
  specialtyId: catalogId.nullish().transform((value) => value ?? null),
}).strict();

export type ProfileInput = z.infer<typeof profileInput>;
