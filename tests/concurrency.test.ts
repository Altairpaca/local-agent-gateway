import assert from "node:assert/strict";
import test from "node:test";
import type { AdapterExecutionContext, LocalAgentAdapter } from "../src/adapter.js";
import type { CapabilityGrant, DelegationRequest } from "../src/contracts.js";
import { GatewayDispatcher } from "../src/dispatcher.js";
import { StaticAdapterRegistry, StaticProjectRegistry } from "../src/registry.js";
import { sha256Canonical } from "../src/receipt.js";

const grant: CapabilityGrant = {
  id: "grant-1",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  issuedAt: "2026-09-04T00:00:00Z",
  expiresAt: "2026-09-05T00:00:00Z",
  capabilities: ["agent.delegate"],
  projectIds: ["dshelm", "other"],
  agentIds: ["codex"],
};

const request: DelegationRequest = {
  id: "concurrent-request",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  capability: "agent.delegate",
  projectId: "dshelm",
  agentId: "codex",
};

function createBlockingAdapter() {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;

  const adapter: LocalAgentAdapter = {
    id: "codex",
    capabilities: ["agent.delegate"],
    async execute(context: AdapterExecutionContext) {
      calls += 1;
      await barrier;
      return {
        outcome: "success" as const,
        startedAt: "2026-09-04T12:00:01Z",
        finishedAt: "2026-09-04T12:00:02Z",
        evidenceSha256: sha256Canonical({ request: context.request.id }),
      };
    },
  };

  return { adapter, release, calls: () => calls };
}

test("concurrent identical requests execute the adapter at most once", async () => {
  const blocking = createBlockingAdapter();
  const dispatcher = new GatewayDispatcher({
    projects: new StaticProjectRegistry([{ id: "dshelm", root: "/srv/dshelm" }]),
    adapters: new StaticAdapterRegistry([blocking.adapter]),
    now: () => new Date("2026-09-04T12:00:00Z"),
  });

  const firstPromise = dispatcher.dispatch(grant, request);
  const secondPromise = dispatcher.dispatch(grant, request);
  await Promise.resolve();
  assert.equal(blocking.calls(), 1);

  blocking.release();
  const [first, second] = await Promise.all([firstPromise, secondPromise]);

  assert.equal(blocking.calls(), 1);
  assert.equal(first.status, "executed");
  assert.equal(second.status, "replayed");
  assert.equal(first.receipt.receiptSha256, second.receipt.receiptSha256);
});

test("concurrent request-id reuse with changed payload is denied without second execution", async () => {
  const blocking = createBlockingAdapter();
  const dispatcher = new GatewayDispatcher({
    projects: new StaticProjectRegistry([
      { id: "dshelm", root: "/srv/dshelm" },
      { id: "other", root: "/srv/other" },
    ]),
    adapters: new StaticAdapterRegistry([blocking.adapter]),
    now: () => new Date("2026-09-04T12:00:00Z"),
  });

  const firstPromise = dispatcher.dispatch(grant, request);
  const conflict = await dispatcher.dispatch(grant, { ...request, projectId: "other" });

  assert.equal(conflict.status, "denied");
  assert.equal(conflict.denialReason, "request-id-conflict");
  assert.equal(blocking.calls(), 1);

  blocking.release();
  await firstPromise;
  assert.equal(blocking.calls(), 1);
});
