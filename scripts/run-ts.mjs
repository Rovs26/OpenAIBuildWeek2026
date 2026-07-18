#!/usr/bin/env node

/**
 * Minimal TypeScript command runner for this dependency-free repository.
 * It emits one requested P2 script and its local imports to a temporary folder,
 * executes the resulting CommonJS file, then removes the temporary output.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const [entry, ...entryArgs] = process.argv.slice(2);

if (!entry || !entry.endsWith(".ts")) {
  console.error("Usage: node scripts/run-ts.mjs scripts/<command>.ts [arguments]");
  process.exit(1);
}

const source = resolve(repositoryRoot, entry);
if (!existsSync(source)) {
  console.error(`TypeScript command not found: ${entry}`);
  process.exit(1);
}

const compiler = resolve(repositoryRoot, "node_modules/.bin/tsc");
if (!existsSync(compiler)) {
  console.error("TypeScript compiler missing. Run npm install first.");
  process.exit(1);
}

const outputDirectory = mkdtempSync(join(tmpdir(), "basa-p2-"));
try {
  const compilation = spawnSync(
    compiler,
    [
      "--pretty",
      "false",
      "--target",
      "ES2020",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "true",
      "--skipLibCheck",
      "true",
      "--noEmit",
      "false",
      "--outDir",
      outputDirectory,
      "--rootDir",
      repositoryRoot,
      source,
    ],
    { cwd: repositoryRoot, stdio: "inherit" },
  );

  if (compilation.status !== 0) process.exit(compilation.status ?? 1);

  const emitted = join(
    outputDirectory,
    relative(repositoryRoot, source).replace(extname(source), ".js"),
  );
  const execution = spawnSync(process.execPath, [emitted, ...entryArgs], {
    cwd: repositoryRoot,
    stdio: "inherit",
    // Emitted files live outside the repository, so CommonJS needs this path
    // to resolve approved dependencies such as the OpenAI SDK.
    env: {
      ...process.env,
      NODE_PATH: [resolve(repositoryRoot, "node_modules"), process.env.NODE_PATH]
        .filter(Boolean)
        .join(":"),
    },
  });
  process.exitCode = execution.status ?? 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
