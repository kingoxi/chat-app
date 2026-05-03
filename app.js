/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const fs = require("fs");
const path = require("path");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const logPath = path.join(process.cwd(), "runtime.log");

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;

  try {
    fs.appendFileSync(logPath, line);
  } catch {
    // ignore log file write errors
  }

  console.log(message);
}

const app = next({
  dev,
  hostname: host,
  port,
});

const handle = app.getRequestHandler();

process.on("uncaughtException", (error) => {
  writeLog(`uncaughtException: ${error?.stack || error}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  writeLog(`unhandledRejection: ${reason?.stack || reason}`);
  process.exit(1);
});

app
  .prepare()
  .then(() => {
    writeLog(
      `Preparing Next.js app. node=${process.version} cwd=${process.cwd()} port=${port} host=${host} env=${process.env.NODE_ENV || "unset"}`,
    );

    const server = http.createServer((req, res) => handle(req, res));

    server.listen(port, host, () => {
      writeLog(`Heartline Chat is ready on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    writeLog(`Failed to start Next.js server: ${error?.stack || error}`);
    process.exit(1);
  });
