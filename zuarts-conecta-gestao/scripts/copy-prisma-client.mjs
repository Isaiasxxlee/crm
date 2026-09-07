import { cp, rm } from "node:fs/promises";

await rm("api/dist/generated", { recursive: true, force: true });
await cp("api/generated", "api/dist/generated", { recursive: true });
