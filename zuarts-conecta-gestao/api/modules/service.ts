import { prisma } from "../db.js";
import type { Prisma } from "../generated/client.js";

type Database = Prisma.TransactionClient;

export async function syncTenantModules(companyId: string, planId: string, db: Database) {
  const links = await db.planModule.findMany({ where: { planId }, select: { moduleId: true } });
  await db.tenantModule.deleteMany({ where: { companyId } });
  if (links.length > 0) {
    await db.tenantModule.createMany({ data: links.map(({ moduleId }) => ({ companyId, moduleId })) });
  }
}

export async function getCompanyModules(companyId: string) {
  return prisma.module.findMany({
    where: { active: true, tenantLinks: { some: { companyId } } },
    include: { capabilities: { orderBy: [{ position: "asc" }, { name: "asc" }] } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}