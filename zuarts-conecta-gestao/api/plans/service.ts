import { prisma } from "../db.js";
import type { Plan, Prisma } from "../generated/client.js";

type Database = Prisma.TransactionClient;

export class PlanError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
  }
}

export function getCompanyPlan(companyId: string, db: Database = prisma) {
  return db.subscription.findFirst({ where: { companyId, isCurrent: true }, include: { plan: true } });
}

export function getCompanyClientCount(companyId: string, db: Database = prisma) {
  return db.contact.count({ where: { companyId } });
}

export async function getCompanyUsage(companyId: string, db: Database = prisma) {
  const subscription = await getCompanyPlan(companyId, db);
  const currentClients = await getCompanyClientCount(companyId, db);
  const plan = subscription?.plan ?? null;
  const now = new Date();
  const effectiveStatus = subscription?.status === "ACTIVE" && subscription.endsAt && subscription.endsAt <= now
    ? "EXPIRED" : subscription?.status ?? null;
  const reason = !subscription ? "subscription_required"
    : effectiveStatus !== "ACTIVE" ? "subscription_inactive"
    : subscription.startedAt > now ? "subscription_not_started"
    : !plan?.active ? "plan_inactive"
    : plan.maxClients !== null && currentClients >= plan.maxClients ? "client_limit_reached" : null;
  const maxClients = plan?.maxClients ?? null;
  return {
    plan,
    subscription,
    effectiveStatus,
    usage: {
      currentClients,
      maxClients,
      percentage: maxClients === null ? null : maxClients === 0 ? (currentClients ? 100 : 0) : Math.round(currentClients / maxClients * 100),
      remainingClients: maxClients === null ? null : Math.max(0, maxClients - currentClients),
      canAddClient: reason === null,
      reason,
    },
  };
}

export async function lockCompany(db: Database, companyId: string) {
  await db.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${companyId}::uuid FOR UPDATE`;
}

export async function withClientCapacity<T>(companyId: string, create: (db: Database) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (db) => {
    await lockCompany(db, companyId);
    const { usage } = await getCompanyUsage(companyId, db);
    if (!usage.canAddClient) throw new PlanError(usage.reason ?? "client_limit_reached");
    return create(db);
  });
}

export async function createInitialSubscription(companyId: string, db: Database) {
  const plan = await db.plan.findFirst({ where: { isDefault: true, active: true } });
  if (!plan) return null;
  return db.subscription.create({ data: { companyId, planId: plan.id } });
}

export function planSelectionReason(plan: Plan, current: Awaited<ReturnType<typeof getCompanyUsage>>) {
  if (!plan.active) return "plan_inactive";
  if (current.subscription && (current.effectiveStatus !== "ACTIVE" || current.subscription.startedAt > new Date())) {
    return "subscription_inactive";
  }
  if (plan.maxClients !== null && current.usage.currentClients > plan.maxClients) return "plan_capacity_exceeded";
  return null;
}

export async function selectCompanyPlan(companyId: string, planId: string) {
  return prisma.$transaction(async (db) => {
    await lockCompany(db, companyId);
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new PlanError("plan_not_found", 404);
    const current = await getCompanyUsage(companyId, db);
    const reason = planSelectionReason(plan, current);
    if (reason) throw new PlanError(reason);
    if (current.subscription?.planId === planId) return current;
    const now = new Date();
    if (current.subscription) {
      await db.subscription.update({
        where: { id: current.subscription.id, companyId },
        data: { isCurrent: false, status: "CANCELLED", cancelledAt: now, endsAt: now },
      });
    }
    await db.subscription.create({ data: { companyId, planId, startedAt: now } });
    return getCompanyUsage(companyId, db);
  });
}
