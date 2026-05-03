/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const fs = require("fs");
const path = require("path");
const next = require("next");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const lines = fileContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return true;
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, ".env"));
loadEnvFile(path.join(cwd, ".env.production"));

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const logPath = path.join(cwd, "runtime.log");

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
