import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[1];
const text = readFileSync(path, "utf8");
const normalized = text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
writeFileSync(path, normalized, "utf8");
console.log("normalized:", path);