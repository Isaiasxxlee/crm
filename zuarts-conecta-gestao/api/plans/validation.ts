import { z } from "zod";

export const planSelection = z.object({ planId: z.uuid() }).strict();
export const planIdInput = z.uuid();
