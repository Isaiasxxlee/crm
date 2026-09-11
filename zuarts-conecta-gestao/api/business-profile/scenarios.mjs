import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function profileScenarios(t, api, agentA, agentB, pool) {
  const root = "/api/business-profile";
  const a = { cookie: agentA.cookie };
  const b = { cookie: agentB.cookie };
  let segments;
  let clinic;
  let petType;
  let psychology;
  let health;
  let pet;
  let profileId;
  const put = (body, options = a) => api(root, { ...options, method: "PUT", body });

  await t.test("rejects unauthenticated access to every endpoint", async () => {
    for (const path of [root, `${root}/segments`, `${root}/types`, `${root}/specialties`]) {
      assert.equal((await api(path)).status, 401);
    }
    assert.equal((await put({}, {})).status, 401);
  });

  await t.test("lists the seven seeded segments with correct labels", async () => {
    const result = await api(`${root}/segments`, a);
    assert.equal(result.status, 200);
    segments = result.data.data;
    assert.deepEqual(segments.slice(0, 7).map((item) => item.name), [
      "Comércio", "Alimentação", "Beleza e Estética", "Saúde", "Pet", "Serviços Profissionais", "Outros",
    ]);
    health = segments.find((item) => item.name === "Saúde");
    pet = segments.find((item) => item.name === "Pet");
  });

  await t.test("creates a configurable segment in the database and lists it", async () => {
    const id = randomUUID();
    try {
      await pool.query('INSERT INTO "BusinessSegment" (id, name, position) VALUES ($1, $2, $3)', [id, `Teste ${id}`, 100]);
      const result = await api(`${root}/segments`, a);
      assert.ok(result.data.data.some((item) => item.id === id));
      assert.deepEqual((await api(`${root}/types?segmentId=${id}`, a)).data.data, []);
    } finally {
      await pool.query('DELETE FROM "BusinessSegment" WHERE id = $1', [id]);
    }
  });

  await t.test("lists types only within their segment", async () => {
    let total = 0;
    for (const segment of segments) {
      const result = await api(`${root}/types?segmentId=${segment.id}`, a);
      assert.equal(result.status, 200);
      assert.ok(result.data.data.every((type) => type.segmentId === segment.id));
      total += result.data.data.length;
      clinic ??= result.data.data.find((type) => type.name === "Clínica");
      petType ??= result.data.data.find((type) => type.name === "Pet Shop");
    }
    assert.ok(total >= 27);
  });

  await t.test("lists specialties for their type and returns empty lists when absent", async () => {
    const result = await api(`${root}/specialties?businessTypeId=${clinic.id}`, a);
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.data.map((item) => item.name), ["Psicologia", "Fisioterapia", "Nutrição"]);
    assert.ok(result.data.data.every((item) => item.businessTypeId === clinic.id));
    psychology = result.data.data[0];
    assert.deepEqual((await api(`${root}/specialties?businessTypeId=${petType.id}`, a)).data.data, []);
  });

  await t.test("returns null for a company without a profile", async () => {
    assert.equal((await api(root, a)).data.data, null);
  });

  await t.test("creates and reads a profile with an optional specialty", async () => {
    const result = await put({ segmentId: health.id, businessTypeId: clinic.id, specialtyId: psychology.id });
    assert.equal(result.status, 200);
    profileId = result.data.data.id;
    assert.equal(result.data.data.companyId, agentA.companyId);
    const read = await api(root, a);
    assert.equal(read.data.data.id, profileId);
    assert.equal(read.data.data.businessType.segment.id, health.id);
    assert.equal(read.data.data.specialty.id, psychology.id);
    assert.equal(read.data.data.specialty.name, "Psicologia");
  });

  await t.test("updates the same profile and clears an omitted specialty", async () => {
    const result = await put({ segmentId: pet.id, businessTypeId: petType.id });
    assert.equal(result.status, 200);
    assert.equal(result.data.data.id, profileId);
    assert.equal(result.data.data.specialtyId, null);
    assert.equal(result.data.data.businessTypeId, petType.id);
  });

  await t.test("isolates companies and rejects companyId or profileId injection", async () => {
    assert.equal((await api(root, b)).data.data, null);
    const created = await put({ segmentId: health.id, businessTypeId: clinic.id, specialtyId: null }, b);
    assert.equal(created.status, 200);
    assert.equal(created.data.data.companyId, agentB.companyId);
    assert.notEqual(created.data.data.id, profileId);
    const body = { segmentId: health.id, businessTypeId: clinic.id };
    assert.equal((await put({ ...body, companyId: agentB.companyId })).status, 400);
    assert.equal((await put({ ...body, id: created.data.data.id })).status, 400);
    assert.equal((await api(`${root}/${created.data.data.id}`, a)).status, 404);
    assert.equal((await api(`${root}?companyId=${agentB.companyId}`, a)).data.data.id, profileId);
    assert.equal((await api(root, b)).data.data.businessTypeId, clinic.id);
    assert.equal((await api(root, a)).data.data.businessTypeId, petType.id);
  });

  await t.test("rejects incompatible types and specialties without changing the profile", async () => {
    assert.equal((await put({ segmentId: health.id, businessTypeId: petType.id })).status, 400);
    assert.equal((await put({ segmentId: pet.id, businessTypeId: petType.id, specialtyId: psychology.id })).status, 400);
    assert.equal((await api(root, a)).data.data.businessTypeId, petType.id);
  });

  await t.test("rejects invalid input and missing catalog records", async () => {
    for (const body of [null, [], {}, { segmentId: "bad", businessTypeId: 1 }, { segmentId: pet.id, businessTypeId: petType.id, specialtyId: "" }]) {
      assert.equal((await put(body)).status, 400);
    }
    for (const body of [
      { segmentId: randomUUID(), businessTypeId: petType.id },
      { segmentId: pet.id, businessTypeId: randomUUID() },
      { segmentId: pet.id, businessTypeId: petType.id, specialtyId: randomUUID() },
    ]) assert.equal((await put(body)).status, 404);
    assert.equal((await api(`${root}/types?segmentId=bad`, a)).status, 400);
    assert.equal((await api(`${root}/types?segmentId=${randomUUID()}`, a)).status, 404);
    assert.equal((await api(`${root}/specialties?businessTypeId=${randomUUID()}`, a)).status, 404);
    assert.equal((await api(`${root}/specialties?businessTypeId=bad`, a)).status, 400);
    assert.equal((await api(root, { ...a, method: "DELETE" })).status, 405);
  });

  await t.test("the database rejects a specialty from another type", async () => {
    await assert.rejects(pool.query('UPDATE "BusinessProfile" SET "specialtyId" = $1 WHERE id = $2', [psychology.id, profileId]), { code: "23503" });
  });

  await t.test("the database permits only one profile per company", async () => {
    await assert.rejects(pool.query('INSERT INTO "BusinessProfile" (id, "companyId", "businessTypeId", "updatedAt") VALUES ($1, $2, $3, NOW())',
      [randomUUID(), agentA.companyId, petType.id]), { code: "23505" });
  });

  await t.test("rejects authenticated users without company membership", async () => {
    await pool.query('DELETE FROM "Membership" WHERE "userId" = $1 AND "companyId" = $2', [agentB.userId, agentB.companyId]);
    assert.equal((await api(root, b)).status, 403);
    assert.equal((await put({ segmentId: pet.id, businessTypeId: petType.id }, b)).status, 403);
  });
}
