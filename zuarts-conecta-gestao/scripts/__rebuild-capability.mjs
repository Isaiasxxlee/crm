import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[1];
let text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const start = text.indexOf('INSERT INTO "Capability" ("id", "moduleId", "slug", "name", "description", "position", "updatedAt") VALUES
;
const after = text.slice(start);
const newline = after.indexOf("\n");
const rowsBlock = after.slice(newline + 1);
const endOfStatement = rowsBlock.indexOf(";");
const rowsText = rowsBlock.slice(0, endOfStatement);
const rest = rowsBlock.slice(endOfStatement);
const rows = rowsText
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("('9c7d"))
  .map((line) => line.slice(0, -1) + ", CURRENT_TIMESTAMP" + line.slice(-1));
const rebuilt = [
  'INSERT INTO "Capability" ("id", "moduleId", "slug", "name", "description", "position", "updatedAt") VALUES',
  rows.join("\n"),
].join("\n");
text = before + rebuilt + rest;
writeFileSync(path, text, "utf8");
const check = readFileSync(path, "utf8");
const checkStart = check.indexOf('INSERT INTO "Capability"');
const checkEnd = check.indexOf('INSERT INTO "PlanModule"');
const block = check.slice(checkStart, checkEnd);
console.log("rows rebuilt:", rows.length);
console.log("header ok:", block.includes('"updatedAt") VALUES'));
console.log("every row has updatedAt:", block.split("\n").filter((l) => l.trim().startsWith("('9c7d")).every((l) => l.endsWith(", CURRENT_TIMESTAMP),") || l.endsWith(", CURRENT_TIMESTAMP);")));
console.log("crlf remaining:", /(\r\n|\r)/.test(check));