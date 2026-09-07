import { randomBytes } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { prisma } from "./db.js";
import { auth } from "./auth.js";

export type ContextCompany = { id: string; slug: string; name: string };

export type Context = {
  user: { id: string; email: string; name: string };
  company: ContextCompany;
  role: string;
};

export async function authenticateUser(nodeHeaders: IncomingHttpHeaders) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(nodeHeaders) });
  if (!session?.user) return null;
  const user = session.user;
  return { id: user.id, email: user.email, name: user.name ?? "" };
}

export async function findContext(userId: string): Promise<Context | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    select: {
      role: true,
      company: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!membership) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;
  return { user, company: membership.company, role: membership.role as string };
}

export async function ensureCompany(userId: string, name?: string): Promise<Context | null> {
  const existing = await findContext(userId);
  if (existing) return existing;
  const companyName = name?.trim() || "Mi Empresa";
  const company = await prisma.company.create({
    data: { slug: makeSlug(companyName), name: companyName },
  });
  await prisma.membership.create({
    data: { companyId: company.id, userId, role: "OWNER" },
  });
  return findContext(userId);
}

function makeSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "empresa";
  return `${base}-${randomToken(6)}`;
}

function randomToken(bytes: number) {
  return Buffer.from(randomBytes(bytes)).toString("hex");
}