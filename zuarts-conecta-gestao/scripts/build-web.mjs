import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(rootDir, "..");
const webDir = path.join(projectDir, "web");
const distDir = path.join(projectDir, "dist", "web");
const shouldWatch = process.argv.includes("--watch");

async function copyDir(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function buildOnce() {
  await rm(distDir, { recursive: true, force: true });
  await copyDir(webDir, distDir);
}

await buildOnce();

if (shouldWatch) {
  console.log(`watching ${webDir} for changes...`);
  watch(webDir, { persistent: true }, () => {
    buildOnce().catch((error) => {
      console.error(error);
    });
  });
}
