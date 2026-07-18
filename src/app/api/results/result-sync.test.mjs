import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function importTypeScript(relativePath) {
  const source = await readFile(path.resolve(testDirectory, relativePath), "utf8");
  const emitted = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(emitted).toString("base64")}`;
  return import(url);
}

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  clear() {
    this.#values.clear();
  }
}

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalWarn = console.warn;
const storage = new MemoryStorage();
let syncResult;
let retryPendingResults;

function result(studentName, theta = 0) {
  return {
    studentName,
    theta,
    standardError: 1,
    responses: [],
    levelBand: "Developing",
  };
}

function pendingResults() {
  const raw = storage.getItem("pending-results");
  return raw ? JSON.parse(raw) : [];
}

before(async () => {
  globalThis.window = { localStorage: storage };
  console.warn = () => {};
  ({ retryPendingResults, syncResult } = await importTypeScript("../../../lib/resultSync.ts"));
});

after(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

test("queues failed syncs and keeps only the newest result per learner", async () => {
  storage.clear();
  globalThis.fetch = async () => {
    throw new Error("offline");
  };

  await syncResult(result("Mika Santos", -1));
  await syncResult(result("mika santos", 0.75));

  const pending = pendingResults();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].studentName, "mika santos");
  assert.equal(pending[0].theta, 0.75);
});

test("retries pending results and retains only requests that still fail", async () => {
  storage.setItem(
    "pending-results",
    JSON.stringify([result("Ready Learner"), result("Still Offline")]),
  );
  const postedNames = [];

  globalThis.fetch = async (_url, options) => {
    const submitted = JSON.parse(options.body);
    postedNames.push(submitted.studentName);
    if (submitted.studentName === "Still Offline") {
      return new Response(null, { status: 503 });
    }
    return new Response(JSON.stringify(submitted), { status: 201 });
  };

  await retryPendingResults();

  assert.deepEqual(postedNames, ["Ready Learner", "Still Offline"]);
  assert.deepEqual(
    pendingResults().map((entry) => entry.studentName),
    ["Still Offline"],
  );
});

test("clears the queue after connectivity returns", async () => {
  globalThis.fetch = async () => new Response(null, { status: 201 });

  await retryPendingResults();

  assert.equal(storage.getItem("pending-results"), null);
});

test("does not create a pending entry after a successful sync", async () => {
  storage.clear();
  globalThis.fetch = async () => new Response(null, { status: 201 });

  await syncResult(result("Online Learner"));

  assert.deepEqual(pendingResults(), []);
});
