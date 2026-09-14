import pg from "pg";
import "dotenv/config";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (label, sql, params) => {
  const { rows } = await pool.query(sql, params);
  console.log(label, JSON.stringify(rows));
};
await q("modules:", 'SELECT count(*)::int AS total FROM "Module"');
await q("capabilities:", 'SELECT count(*)::int AS total FROM "Capability"');
await q("plan_modules:", 'SELECT p."slug", count(*)::int AS total FROM "PlanModule" pm JOIN "Plan" p ON p."id" = pm."planId" GROUP BY p."slug" ORDER BY p."slug"');
await q("modules_essencial:", 'SELECT m."slug" FROM "PlanModule" pm JOIN "Plan" p ON p."id" = pm."planId" JOIN "Module" m ON m."id" = pm."moduleId" WHERE p."slug" = \'essencial\' ORDER BY m."position"');
await q("modules_premium:", 'SELECT m."slug" FROM "PlanModule" pm JOIN "Plan" p ON p."id" = pm."planId" JOIN "Module" m ON m."id" = pm."moduleId" WHERE p."slug" = \'premium\' ORDER BY m."position"');
await q("tenant_modules:", 'SELECT count(*)::int AS total FROM "TenantModule"');
await q("accents:", 'SELECT "name" FROM "Module" WHERE "slug" = \'clientes\'');
await pool.end();