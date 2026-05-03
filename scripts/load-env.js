/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

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

function loadRuntimeEnv(baseDir = process.cwd()) {
  const parentDir = path.dirname(baseDir);

  const candidateDirs = [parentDir, baseDir];
  const candidateFiles = [".env", ".env.production"];

  for (const dir of candidateDirs) {
    for (const file of candidateFiles) {
      loadEnvFile(path.join(dir, file));
    }
  }
}

module.exports = {
  loadEnvFile,
  loadRuntimeEnv,
};
