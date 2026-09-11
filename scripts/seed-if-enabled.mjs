import { spawnSync } from "node:child_process";

if (process.env.SEED_DATABASE !== "true") {
  console.log("Skipping database seed; set SEED_DATABASE=true to enable it.");
  process.exit(0);
}

const prismaCommand = process.platform === "win32" ? "prisma.cmd" : "prisma";
const result = spawnSync(prismaCommand, ["db", "seed"], { stdio: "inherit" });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
