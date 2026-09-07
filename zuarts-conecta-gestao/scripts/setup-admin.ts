import "dotenv/config";
import { auth } from "../api/auth.js";
import { prisma } from "../api/db.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrador Zuarts";

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
}

if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
}

const existingUser = await prisma.user.findUnique({ where: { email } });
let userId = existingUser?.id;

if (!existingUser) {
  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  });
  userId = result.user.id;
  console.log(`Admin user created: ${email}`);
} else {
  console.log(`Admin user already exists: ${email}`);
}

if (!userId) {
  throw new Error("Admin user was not created");
}

const membership = await prisma.membership.findFirst({
  where: { userId },
  select: { id: true },
});

if (membership) {
  await prisma.membership.update({
    where: { id: membership.id },
    data: { role: "ADMIN" },
  });
} else {
  const company = await prisma.company.create({
    data: { name: "Zuarts Inova Simples (I.S.)", slug: `zuarts-${Date.now()}` },
  });
  await prisma.membership.create({
    data: { companyId: company.id, userId, role: "ADMIN" },
  });
}

console.log(`Admin membership ready: ${email}`);
await prisma.$disconnect();
