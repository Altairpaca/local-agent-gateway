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

test("reference adapter hashes bounded sanitized evidence", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:01Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => ({ files: 3, source: "fixture" }),
  });

  const result = await adapter.execute(context("workspace.read"));
  assert.equal(result.outcome, "success");
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

test("reference adapter fails closed on undeclared capability", async () => {
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    execute: async () => ({}),
  });
  await assert.rejects(() => adapter.execute(context("workspace.write")), /cannot execute capability/);
});

test("reference adapter converts executor errors into bounded failure evidence", async () => {
  const times = [new Date("2026-09-05T00:00:00Z"), new Date("2026-09-05T00:00:02Z")];
  const adapter = createReferenceAdapter({
    id: "reference",
    capabilities: ["workspace.read"],
    now: () => times.shift()!,
    execute: async () => {
      throw new Error("fixture failed");
    },
  });
  const result = await adapter.execute(context("workspace.read"));
  assert.equal(result.outcome, "failure");
  assert.deepEqual(result.details, { error: "fixture failed" });
});
