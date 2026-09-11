import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function planScenarios(t, api, agentA, agentB, pool) {
  const a = { cookie: agentA.cookie };
  const b = { cookie: agentB.cookie };
  const current = (options = a) => api("/api/subscription", options);
  const select = (planId, options = a, extra = {}) => api("/api/subscription", { ...options, method: "PUT", body: { planId, ...extra } });
  const add = (options = a) => api("/api/crm/contacts", { ...options, method: "POST", body: { firstName: "Teste de limite" } });
  let essential;
  let professional;
  let premium;
  let originalSubscription;

  await t.test("lists seeded plans, configurable prices and unlimited capacity", async () => {
    const result = await api("/api/plans", a);
    assert.equal(result.status, 200);
    essential = result.data.data.find((plan) => plan.slug === "essencial");
    professional = result.data.data.find((plan) => plan.slug === "profissional");
    premium = result.data.data.find((plan) => plan.slug === "premium");
    assert.equal(essential.name, "Essencial");
    assert.equal(Number(essential.price), 100);
    assert.equal(essential.currency, "BRL");
    assert.equal(essential.billingPeriod, "MONTHLY");
    assert.equal(essential.minClients, 0);
    assert.equal(essential.maxClients, 10);
    assert.equal(professional.minClients, 11);
    assert.equal(professional.maxClients, 30);
    assert.equal(professional.price, null);
    assert.equal(premium.minClients, 31);
    assert.equal(premium.maxClients, null);
    assert.equal(premium.price, null);
    assert.equal((await api(`/api/plans/${essential.id}`, a)).data.data.id, essential.id);
    assert.equal((await api(`/api/plans/${randomUUID()}`, a)).status, 404);
    assert.equal((await api("/api/plans/invalid", a)).status, 400);
  });

  await t.test("new companies receive the configured default subscription", async () => {
    const result = await current();
    assert.equal(result.status, 200);
    assert.equal(result.data.data.subscription.companyId, agentA.companyId);
    assert.equal(result.data.data.plan.id, essential.id);
    assert.equal(result.data.data.subscription.status, "ACTIVE");
    assert.equal(result.data.data.usage.currentClients, 0);
    assert.equal(result.data.data.usage.canAddClient, true);
    originalSubscription = result.data.data.subscription.id;
    assert.notEqual((await current(b)).data.data.subscription.id, originalSubscription);
  });

  await t.test("all plan and subscription endpoints require authentication", async () => {
    for (const url of ["/api/plans", `/api/plans/${essential.id}`, "/api/subscription", "/api/subscription/usage"]) {
      assert.equal((await api(url)).status, 401);
    }
    assert.equal((await select(premium.id, {})).status, 401);
  });

  await t.test("tenant IDs and foreign subscription IDs never authorize access", async () => {
    const other = (await current(b)).data.data.subscription;
    assert.equal((await api(`/api/subscription?companyId=${agentB.companyId}`, a)).data.data.subscription.companyId, agentA.companyId);
    assert.equal((await select(premium.id, a, { companyId: agentB.companyId })).status, 400);
    assert.equal((await select(premium.id, a, { subscriptionId: other.id })).status, 400);
    assert.equal((await api(`/api/subscription/${other.id}`, a)).status, 404);
    assert.equal((await api(`/api/subscription/${other.id}`, { ...a, method: "PUT", body: { planId: premium.id } })).status, 404);
    assert.equal((await current(b)).data.data.subscription.id, other.id);
    assert.equal((await current(b)).data.data.plan.id, essential.id);
  });

  await t.test("real Contact rows count toward the Essential limit", async () => {
    for (let count = 0; count < 8; count++) assert.equal((await add()).status, 201);
    const result = await api("/api/subscription/usage", a);
    assert.equal(result.data.data.usage.currentClients, 8);
    assert.equal(result.data.data.usage.percentage, 80);
    assert.equal(result.data.data.usage.remainingClients, 2);
    assert.equal(result.data.data.usage.canAddClient, true);
    assert.equal((await current(b)).data.data.usage.currentClients, 0);
  });

  await t.test("concurrent contact creation cannot exceed Essential capacity", async () => {
    assert.equal((await add()).status, 201);
    const results = await Promise.all([add(), add()]);
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    assert.equal(results.find((result) => result.status === 409).data.error, "client_limit_reached");
    const usage = (await current()).data.data.usage;
    assert.equal(usage.currentClients, 10);
    assert.equal(usage.percentage, 100);
    assert.equal(usage.canAddClient, false);
    assert.equal((await add()).status, 409);
  });

  await t.test("plan changes retain history and do not duplicate the current subscription", async () => {
    assert.equal((await select(professional.id)).status, 200);
    const history = await pool.query('SELECT * FROM "Subscription" WHERE "companyId" = $1', [agentA.companyId]);
    assert.equal(history.rows.length, 2);
    const old = history.rows.find((row) => row.id === originalSubscription);
    assert.equal(old.status, "CANCELLED");
    assert.equal(old.isCurrent, false);
    assert.ok(old.cancelledAt);
    assert.ok(old.endsAt);
    const selected = (await current()).data.data.subscription.id;
    assert.equal((await select(professional.id)).data.data.subscription.id, selected);
    assert.equal((await pool.query('SELECT * FROM "Subscription" WHERE "companyId" = $1', [agentA.companyId])).rows.length, 2);
  });

  await t.test("Professional allows thirty clients and rejects the next one", async () => {
    for (let count = 10; count < 30; count++) assert.equal((await add()).status, 201);
    assert.equal((await current()).data.data.usage.currentClients, 30);
    assert.equal((await add()).data.error, "client_limit_reached");
    assert.equal((await select(essential.id)).data.error, "plan_capacity_exceeded");
    assert.equal((await current()).data.data.plan.id, professional.id);
    const options = (await api("/api/plans", a)).data.data;
    assert.equal(options.find((plan) => plan.id === essential.id).canSelect, false);
  });

  await t.test("Premium has no maximum or artificial usage percentage", async () => {
    assert.equal((await select(premium.id)).status, 200);
    for (let count = 30; count < 35; count++) assert.equal((await add()).status, 201);
    const usage = (await current()).data.data.usage;
    assert.equal(usage.currentClients, 35);
    assert.equal(usage.maxClients, null);
    assert.equal(usage.percentage, null);
    assert.equal(usage.remainingClients, null);
    assert.equal(usage.canAddClient, true);
  });

  await t.test("archived contacts still count and deleting a contact releases capacity", async () => {
    const { rows } = await pool.query('UPDATE "Contact" SET "archivedAt" = NOW() WHERE id = (SELECT id FROM "Contact" WHERE "companyId" = $1 LIMIT 1) RETURNING id', [agentA.companyId]);
    assert.equal((await current()).data.data.usage.currentClients, 35);
    assert.equal((await api(`/api/crm/contacts/${rows[0].id}`, { ...a, method: "DELETE" })).status, 200);
    assert.equal((await current()).data.data.usage.currentClients, 34);
  });

  await t.test("non-active subscriptions block additions and self-reactivation", async () => {
    for (const status of ["PENDING", "SUSPENDED", "CANCELLED", "EXPIRED"]) {
      await pool.query('UPDATE "Subscription" SET status = $1 WHERE "companyId" = $2 AND "isCurrent"', [status, agentA.companyId]);
      assert.equal((await current()).data.data.usage.canAddClient, false);
      assert.equal((await add()).data.error, "subscription_inactive");
      assert.equal((await select(premium.id)).data.error, "subscription_inactive");
      assert.equal((await api("/api/crm/contacts", a)).status, 200);
    }
    await pool.query('UPDATE "Subscription" SET status = $1 WHERE "companyId" = $2 AND "isCurrent"', ["ACTIVE", agentA.companyId]);
  });

  await t.test("start and end dates govern capacity without a billing scheduler", async () => {
    await pool.query('UPDATE "Subscription" SET "endsAt" = NOW() - INTERVAL \'1 day\' WHERE "companyId" = $1 AND "isCurrent"', [agentA.companyId]);
    assert.equal((await current()).data.data.effectiveStatus, "EXPIRED");
    assert.equal((await add()).status, 409);
    await pool.query('UPDATE "Subscription" SET "endsAt" = NULL, "startedAt" = NOW() + INTERVAL \'1 day\' WHERE "companyId" = $1 AND "isCurrent"', [agentA.companyId]);
    assert.equal((await add()).data.error, "subscription_not_started");
    await pool.query('UPDATE "Subscription" SET "startedAt" = NOW() WHERE "companyId" = $1 AND "isCurrent"', [agentA.companyId]);
  });

  await t.test("members read usage but cannot change the company plan", async () => {
    await pool.query('UPDATE "Membership" SET role = $1 WHERE "companyId" = $2 AND "userId" = $3', ["MEMBER", agentA.companyId, agentA.userId]);
    assert.equal((await current()).data.data.canManage, false);
    assert.equal((await select(premium.id)).status, 403);
    await pool.query('UPDATE "Membership" SET role = $1 WHERE "companyId" = $2 AND "userId" = $3', ["OWNER", agentA.companyId, agentA.userId]);
  });

  await t.test("configurable plans and inactive plans use database rules", async () => {
    const id = randomUUID();
    await pool.query('INSERT INTO "Plan" (id, name, slug, description, price, "minClients", "maxClients", "updatedAt") VALUES ($1, $2, $3, $4, $5, 0, 40, NOW())',
      [id, "Plano configurável", `test-${id}`, "Configuração de teste", "125.50"]);
    try {
      assert.equal((await api(`/api/plans/${id}`, a)).data.data.price, "125.5");
      assert.equal((await select(id)).status, 200);
      assert.equal((await current()).data.data.usage.maxClients, 40);
      await pool.query('UPDATE "Plan" SET active = false WHERE id = $1', [id]);
      assert.equal((await api(`/api/plans/${id}`, a)).status, 404);
      assert.equal((await api("/api/plans", a)).data.data.some((plan) => plan.id === id), false);
      assert.equal((await add()).data.error, "plan_inactive");
      assert.equal((await select(id)).data.error, "plan_inactive");
      assert.equal((await select(premium.id)).status, 200);
    } finally {
      await pool.query('DELETE FROM "Subscription" WHERE "companyId" = $1 AND "planId" = $2', [agentA.companyId, id]);
      await pool.query('DELETE FROM "Plan" WHERE id = $1', [id]);
    }
  });

  await t.test("concurrent plan selection preserves one current subscription", async () => {
    const results = await Promise.all([select(professional.id, b), select(premium.id, b)]);
    assert.ok(results.every((result) => result.status === 200));
    const { rows } = await pool.query('SELECT id FROM "Subscription" WHERE "companyId" = $1 AND "isCurrent"', [agentB.companyId]);
    assert.equal(rows.length, 1);
    await assert.rejects(pool.query('INSERT INTO "Subscription" (id, "companyId", "planId", "updatedAt") VALUES ($1, $2, $3, NOW())', [randomUUID(), agentB.companyId, premium.id]), { code: "23505" });
  });

  await t.test("missing subscriptions block additions and allow authorized initial selection", async () => {
    await pool.query('UPDATE "Subscription" SET "isCurrent" = false WHERE "companyId" = $1', [agentB.companyId]);
    assert.equal((await current(b)).data.data.usage.reason, "subscription_required");
    assert.equal((await add(b)).status, 409);
    assert.equal((await select(essential.id, b)).status, 200);
  });

  await t.test("invalid plan selection and absent membership are rejected", async () => {
    assert.equal((await select(randomUUID())).status, 404);
    assert.equal((await select("invalid")).status, 400);
    await pool.query('DELETE FROM "Membership" WHERE "companyId" = $1 AND "userId" = $2', [agentB.companyId, agentB.userId]);
    assert.equal((await current(b)).status, 403);
    assert.equal((await select(premium.id, b)).status, 403);
  });
}
