import assert from "node:assert/strict";
import test from "node:test";

import { createReferenceAdapter, sha256Canonical } from "../src/index.js";
import type { AdapterExecutionContext } from "../src/adapter.js";

function context(capability: "workspace.read" | "workspace.write"): AdapterExecutionContext {
  return {
    request: {
      id: "req-1",
      subject: "user-1",
      sessionId: "session-1",
      capability,
      projectId: "demo",
      agentId: "reference",
    },
    project: { id: "demo", root: "/admin/controlled/demo" },
  };
}

test("reference adapter hashes only explicitly sanitized success evidence", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:01Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => ({ files: 3, source: "fixture", token: "secret" }),
    sanitizeDetails: ({ files, source }) => ({ files, source }),
  });

  const result = await adapter.execute(context("workspace.read"));
  assert.equal(result.outcome, "success");
  assert.deepEqual(result.details, { files: 3, source: "fixture" });
  assert.equal(
    result.evidenceSha256,
    sha256Canonical({
      adapterId: "reference",
      requestId: "req-1",
      projectId: "demo",
      capability: "workspace.read",
      details: { files: 3, source: "fixture" },
    }),
  );
});

test("reference adapter drops success details by default", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:01Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => ({ apiKey: "must-not-escape" }),
  });
  const result = await adapter.execute(context("workspace.read"));
  assert.deepEqual(result.details, {});
});

test("reference adapter fails closed on undeclared capability", async () => {
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    execute: async () => ({}),
  });
  await assert.rejects(() => adapter.execute(context("workspace.write")), /cannot execute capability/);
});

test("reference adapter does not expose raw runtime errors by default", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:02Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => {
      throw new Error("token=super-secret filesystem=/private/path");
    },
  });
  const result = await adapter.execute(context("workspace.read"));
  assert.equal(result.outcome, "failure");
  assert.deepEqual(result.details, { error: "runtime-error" });
  assert.doesNotMatch(JSON.stringify(result), /super-secret|private\/path/);
});

test("reference adapter permits an explicit bounded failure sanitizer", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:02Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    sanitizeFailure: () => "runtime-unavailable",
    execute: async () => {
      throw new Error("sensitive upstream failure");
    },
  });
  const result = await adapter.execute(context("workspace.read"));
  assert.deepEqual(result.details, { error: "runtime-unavailable" });
});

test("reference adapter rejects a backwards clock", async () => {
  const times = [new Date("2026-09-05T00:00:01Z"), new Date("2026-09-05T00:00:00Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => ({}),
  });
  await assert.rejects(() => adapter.execute(context("workspace.read")), /clock moved backwards/);
});
