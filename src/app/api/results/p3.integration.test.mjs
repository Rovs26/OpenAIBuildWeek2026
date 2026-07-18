import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "../../../..");
const nextBinary = path.join(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

let serverProcess;
let serverOutput = "";
let baseUrl;

async function getFreePort() {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assert(address && typeof address === "object");
  const { port } = address;
  probe.close();
  await once(probe, "close");
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next.js exited before it was ready.\n${serverOutput}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await delay(150);
  }

  throw new Error(`Next.js did not become ready in time.\n${serverOutput}`);
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(
    process.execPath,
    [nextBinary, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  await waitForServer(`${baseUrl}/`);
}, { timeout: 30_000 });

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;

  serverProcess.kill();
  await Promise.race([once(serverProcess, "exit"), delay(3_000)]);
  if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
});

test("serves the teacher dashboard and installable PWA assets", async () => {
  const [teacher, manifest, serviceWorker, icon192, icon512] = await Promise.all([
    fetch(`${baseUrl}/teacher`),
    fetch(`${baseUrl}/manifest.webmanifest`),
    fetch(`${baseUrl}/sw.js`),
    fetch(`${baseUrl}/icons/icon-192.png`),
    fetch(`${baseUrl}/icons/icon-512.png`),
  ]);

  assert.equal(teacher.status, 200);
  assert.match(await teacher.text(), /Class literacy snapshot/);

  assert.equal(manifest.status, 200);
  const manifestBody = await manifest.json();
  assert.equal(manifestBody.name, "Basa Buddy");
  assert.equal(manifestBody.start_url, "/child");
  assert.equal(manifestBody.display, "standalone");
  assert.deepEqual(
    manifestBody.icons.map((icon) => icon.sizes),
    ["192x192", "512x512"],
  );

  assert.equal(serviceWorker.status, 200);
  const workerSource = await serviceWorker.text();
  assert.match(workerSource, /CACHE_VERSION/);
  assert.match(workerSource, /"\/child"/);
  assert.match(workerSource, /url\.pathname\.startsWith\("\/audio\/"\)/);
  assert.match(workerSource, /cacheFirst\(request\)/);
  assert.match(workerSource, /networkFirst\(request\)/);

  for (const icon of [icon192, icon512]) {
    assert.equal(icon.status, 200);
    assert.match(icon.headers.get("content-type") ?? "", /^image\/png/);
    assert((await icon.arrayBuffer()).byteLength > 100);
  }
});

test("rejects malformed and incomplete result submissions", async () => {
  const malformed = await fetch(`${baseUrl}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Invalid JSON body." });

  const incomplete = await fetch(`${baseUrl}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentName: "Incomplete" }),
  });
  assert.equal(incomplete.status, 400);
  assert.deepEqual(await incomplete.json(), { error: "Invalid session result." });
});

test("recomputes ability on the server and ignores submitted scores", async () => {
  const submitted = {
    studentName: "P3 Test Learner",
    theta: -3,
    standardError: 9,
    responses: [
      { itemId: "one", choiceId: "a", correct: true, ms: 800 },
      { itemId: "two", choiceId: "b", correct: true, ms: 900 },
      { itemId: "three", choiceId: "c", correct: true, ms: 1_000 },
      { itemId: "four", choiceId: "d", correct: true, ms: 1_100 },
    ],
    levelBand: "Emerging",
  };

  const response = await fetch(`${baseUrl}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submitted),
  });

  assert.equal(response.status, 201);
  const stored = await response.json();
  assert.equal(stored.theta, 2);
  assert.equal(stored.standardError, 0.5);
  assert.equal(stored.levelBand, "On Track");
});

test("upserts results case-insensitively by student name", async () => {
  const replacement = {
    studentName: "  p3 test learner  ",
    theta: 3,
    standardError: 0.1,
    responses: [
      { itemId: "one", choiceId: "wrong", correct: false, ms: 1_300 },
    ],
    levelBand: "On Track",
  };

  const postResponse = await fetch(`${baseUrl}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(replacement),
  });
  assert.equal(postResponse.status, 201);

  const getResponse = await fetch(`${baseUrl}/api/results`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers.get("cache-control"), "no-store");

  const results = await getResponse.json();
  const matching = results.filter(
    (result) => result.studentName.toLowerCase() === "p3 test learner",
  );
  assert.equal(matching.length, 1);
  assert.equal(matching[0].theta, -2);
  assert.equal(matching[0].standardError, 1);
  assert.equal(matching[0].levelBand, "Emerging");
});

test("returns a reassessed learner first", async () => {
  const resultFor = (studentName, correct) => ({
    studentName,
    theta: 0,
    standardError: 1,
    responses: [{ itemId: "one", choiceId: "a", correct, ms: 800 }],
    levelBand: "Developing",
  });

  for (const result of [
    resultFor("A3 Reassessed Learner", false),
    resultFor("A3 Newer Learner", true),
    resultFor("a3 reassessed learner", true),
  ]) {
    const response = await fetch(`${baseUrl}/api/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    assert.equal(response.status, 201);
  }

  const results = await (await fetch(`${baseUrl}/api/results`)).json();
  assert.equal(results[0].studentName, "a3 reassessed learner");
});
