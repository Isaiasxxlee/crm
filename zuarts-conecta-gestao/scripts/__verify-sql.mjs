import { readFileSync } from "node:fs";
const s = readFileSync("c:/Users/Windows11/Documents/GitHub/crm/zuarts-conecta-gestao/prisma/migrations/20260910180000_etapa07_modulos_capacidades/migration.sql", "utf8");
const head = s.indexOf('INSERT INTO "Capability"');
const tail = s.indexOf("INSERT INTO \"PlanModule\"");
const block = s.slice(head, tail);
console.log("header fixed:", s.includes('"position", "updatedAt") VALUES'));
console.log("updatedAt values:", (block.match(/, CURRENT_TIMESTAMP\)/g) || []).length);
console.log("valid utf8:", Buffer.from(s, "utf8").toString("utf8") === s);
console.log("accent sample:", s.includes("Visão geral do sistema."));