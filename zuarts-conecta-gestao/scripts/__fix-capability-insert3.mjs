import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[1];
let text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
text = text.replace(
  'INSERT INTO "Capability" ("id", "moduleId", "slug", "name", "description", "position", "updatedAt") VALUES',
  'INSERT INTO "Capability" ("id", "moduleId", "slug", "name", "description", "position", "updatedAt") VALUES',
);
const lines = text.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith("('9c7d") && (line.endsWith("),") || line.endsWith(");")) && !line.includes("CURRENT_TIMESTAMP")) {
    lines[i] = line.slice(0, -1) + ", CURRENT_TIMESTAMP" + line.slice(-1);
  }
}
writeFileSync(path, lines.join("\n"), "utf8");
console.log("fixed capability insert");