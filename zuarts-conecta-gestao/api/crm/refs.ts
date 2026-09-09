import { prisma } from "../db.js";

export type OwnedCheck = (id: string, companyId: string) => Promise<boolean>;

export async function ownedCrmCompany(id: string, companyId: string): Promise<boolean> {
  const row = await prisma.crmCompany.findFirst({ where: { id, companyId }, select: { id: true } });
  return row !== null;
}

export async function ownedContact(id: string, companyId: string): Promise<boolean> {
  const row = await prisma.contact.findFirst({ where: { id, companyId }, select: { id: true } });
  return row !== null;
}

export async function ownedLead(id: string, companyId: string): Promise<boolean> {
  const row = await prisma.lead.findFirst({ where: { id, companyId }, select: { id: true } });
  return row !== null;
}

export async function ownedDeal(id: string, companyId: string): Promise<boolean> {
  const row = await prisma.deal.findFirst({ where: { id, companyId }, select: { id: true } });
  return row !== null;
}

export async function ownedMember(id: string, companyId: string): Promise<boolean> {
  const row = await prisma.membership.findFirst({ where: { companyId, userId: id }, select: { id: true } });
  return row !== null;
}

export type RefCheck = { field: string; id: unknown; owns: OwnedCheck };

export async function requireOwnedRefs(
  companyId: string,
  refs: readonly RefCheck[],
): Promise<{ ok: true } | { ok: false; field: string }> {
  for (const ref of refs) {
    if (ref.id === undefined || ref.id === null) continue;
    const owned = await ref.owns(String(ref.id), companyId);
    if (!owned) return { ok: false, field: ref.field };
  }
  return { ok: true };
}