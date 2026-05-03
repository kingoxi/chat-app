/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const { loadRuntimeEnv } = require("./load-env");

loadRuntimeEnv(process.cwd());

const args = process.argv.slice(2);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to run Next.js command:", error);
  process.exit(1);
});
