import "dotenv/config";
import { parseArgs } from "node:util";
import { z } from "zod";
import { prisma } from "../api/db.js";
import { ChannelType } from "../api/generated/enums.js";

const { values } = parseArgs({
  options: {
    company: { type: "string" },
    "external-id": { type: "string" },
    name: { type: "string" },
    type: { type: "string", default: ChannelType.INSTAGRAM },
    disable: { type: "boolean", default: false },
    list: { type: "boolean", default: false },
  },
});

const input = z.object({
  company: z.string().trim().min(1),
  externalId: z.string().trim().regex(/^[0-9A-Za-z_.-]{1,120}$/),
  name: z.string().trim().min(1).max(160),
  type: z.enum(ChannelType),
});

try {
  if (values.list) {
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, externalId: true, name: true, status: true, company: { select: { slug: true } } },
    });
    for (const channel of channels) {
      console.log(`${channel.type}\t${channel.externalId}\t${channel.status}\t${channel.company.slug}\t${channel.name}`);
    }
    if (channels.length === 0) console.log("Nenhum canal registrado.");
  } else {
    const parsed = input.safeParse({
      company: values.company,
      externalId: values["external-id"],
      name: values.name ?? `${values.type} ${values["external-id"] ?? ""}`.trim(),
      type: values.type,
    });
    if (!parsed.success) {
      throw new Error(
        "Uso: npm run channel:register -- --company <slug-ou-id> --external-id <id-da-conta> [--name <nome>] [--type INSTAGRAM] [--disable]",
      );
    }
    const { company, externalId, name, type } = parsed.data;
    const target = await prisma.company.findFirst({
      where: z.uuid().safeParse(company).success ? { id: company } : { slug: company },
      select: { id: true, slug: true },
    });
    if (!target) throw new Error(`Empresa não encontrada: ${company}`);
    const existing = await prisma.channel.findUnique({
      where: { type_externalId: { type, externalId } },
      select: { id: true, companyId: true },
    });
    if (existing && existing.companyId !== target.id) {
      throw new Error(`O canal ${type} ${externalId} já pertence a outra empresa.`);
    }
    const status = values.disable ? "DISABLED" : "ACTIVE";
    const channel = existing
      ? await prisma.channel.update({ where: { id: existing.id }, data: { name, status } })
      : await prisma.channel.create({ data: { companyId: target.id, type, externalId, name, status } });
    console.log(`Canal ${channel.type} ${channel.externalId} (${channel.status}) registrado para ${target.slug}.`);
  }
} finally {
  await prisma.$disconnect();
}
