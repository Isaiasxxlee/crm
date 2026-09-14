import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[1];
let text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const anchor = '    await handlePlansRequest(req, res, url);\n    return;\n  }\n';
const block = '    await handlePlansRequest(req, res, url);\n    return;\n  }\n\n  if (pathname === "/api/modules" || pathname.startsWith("/api/modules/")) {\n    await handleModulesRequest(req, res, url);\n    return;\n  }\n';
if (!text.includes(block)) {
  if (!text.includes(anchor)) throw new Error("anchor not found");
  text = text.replace(anchor, block);
}
const crlf = text.replace(/\n/g, "\r\n");
writeFileSync(path, crlf, "utf8");
console.log("server.ts route patched");