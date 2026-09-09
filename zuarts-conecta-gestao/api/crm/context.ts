import type { IncomingMessage } from "node:http";
import { authenticateUser, findContext, type Context } from "../tenant.js";

export async function requireContext(req: IncomingMessage): Promise<Context | null> {
  const user = await authenticateUser(req.headers);
  if (!user) return null;
  return findContext(user.id);
}