import { prisma } from "../api/db.js";
import { ensureCompany, findContext } from "../api/tenant.js";

const base = `iso-${Date.now()}`;
let userAId = "";
let userBId = "";
const companyIds = [];

try {
  const userA = await prisma.user.create({
    data: { email: `${base}-a@example.com`, name: "Usuario A" },
  });
  const userB = await prisma.user.create({
    data: { email: `${base}-b@example.com`, name: "Usuario B" },
  });
  userAId = userA.id;
  userBId = userB.id;

  const contextA = await ensureCompany(userA.id, "Empresa Alfa");
  const contextB = await ensureCompany(userB.id, "Empresa Beta");
  if (contextA) companyIds.push(contextA.company.id);
  if (contextB) companyIds.push(contextB.company.id);

  const againA = await findContext(userA.id);
  const againB = await findContext(userB.id);

  const isolated =
    againA !== null &&
    againB !== null &&
    againA.company.id === contextA?.company.id &&
    againA.company.id !== againB.company.id &&
    againA.role === "OWNER";

  console.log(`aislamiento-multitenant=${isolated ? "OK" : "FAIL"}`);
  console.log(`usuario-A-empresa=${againA?.company.name ?? "ninguna"}`);
  console.log(`usuario-B-empresa=${againB?.company.name ?? "ninguna"}`);
  if (!isolated) process.exitCode = 1;
} finally {
  if (companyIds.length) {
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  }
  if (userAId) await prisma.user.delete({ where: { id: userAId } });
  if (userBId) await prisma.user.delete({ where: { id: userBId } });
  await prisma.$disconnect();
}