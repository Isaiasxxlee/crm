import { prisma } from "../api/db.js";

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("PostgreSQL connection: OK");
} finally {
  await prisma.$disconnect();
}
