import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityGrant, DelegationRequest } from "../src/contracts.js";
import { authorize } from "../src/policy.js";
import { createReceipt, verifyReceipt } from "../src/receipt.js";

const grant: CapabilityGrant = {
  id: "grant-1",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  issuedAt: "2026-09-04T00:00:00Z",
  expiresAt: "2026-09-05T00:00:00Z",
  capabilities: ["workspace.read", "agent.delegate"],
  projectIds: ["dshelm"],
  agentIds: ["codex"],
};

const request: DelegationRequest = {
  id: "request-1",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  capability: "agent.delegate",
  projectId: "dshelm",
  agentId: "codex",
};

const now = new Date("2026-09-04T12:00:00Z");

test("matching session-bound grant authorizes delegation", () => {
  assert.deepEqual(authorize(grant, request, now), { allowed: true, reason: "allowed" });
});

test("session mismatch is denied", () => {
  assert.deepEqual(authorize(grant, { ...request, sessionId: "other" }, now), {
    allowed: false,
    reason: "session-mismatch",
  });
});

test("unregistered project is denied even when capability matches", () => {
  assert.deepEqual(authorize(grant, { ...request, projectId: "secret-project" }, now), {
    allowed: false,
    reason: "project-not-granted",
  });
});

test("expired grants are denied", () => {
  assert.deepEqual(authorize(grant, request, new Date("2026-09-05T00:00:00Z")), {
    allowed: false,
    reason: "grant-expired",
  });
});

test("receipt hash detects mutation", () => {
  const receipt = createReceipt({
    request,
    grantId: grant.id,
    startedAt: "2026-09-04T12:00:00Z",
    finishedAt: "2026-09-04T12:01:00Z",
    outcome: "success",
    evidenceSha256: "a".repeat(64),
  });

  assert.equal(verifyReceipt(receipt), true);
  assert.equal(verifyReceipt({ ...receipt, outcome: "failure" }), false);
});
