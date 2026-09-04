import assert from "node:assert/strict";
import test from "node:test";
import type { AdapterExecutionContext, AdapterExecutionResult, LocalAgentAdapter } from "../src/adapter.js";
import type { Capability, CapabilityGrant, DelegationRequest } from "../src/contracts.js";
import { GatewayDispatcher } from "../src/dispatcher.js";
import { StaticAdapterRegistry, StaticProjectRegistry } from "../src/registry.js";
import { sha256Canonical, verifyReceipt } from "../src/receipt.js";

class FakeAdapter implements LocalAgentAdapter {
  readonly id = "codex";
  readonly capabilities: readonly Capability[];
  calls: AdapterExecutionContext[] = [];

  constructor(capabilities: readonly Capability[] = ["agent.delegate"]) {
    this.capabilities = capabilities;
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    this.calls.push(context);
    return {
      outcome: "success",
      startedAt: "2026-09-04T12:00:01Z",
      finishedAt: "2026-09-04T12:00:02Z",
      evidenceSha256: sha256Canonical({ project: context.project.id, request: context.request.id }),
    };
  }
}

const baseGrant: CapabilityGrant = {
  id: "grant-1",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  issuedAt: "2026-09-04T00:00:00Z",
  expiresAt: "2026-09-05T00:00:00Z",
  capabilities: ["agent.delegate"],
  projectIds: ["dshelm"],
  agentIds: ["codex"],
};

const baseRequest: DelegationRequest = {
  id: "request-1",
  subject: "chatgpt:user-1",
  sessionId: "session-1",
  capability: "agent.delegate",
  projectId: "dshelm",
  agentId: "codex",
};

const fixedNow = () => new Date("2026-09-04T12:00:00Z");

function setup(adapter = new FakeAdapter()) {
  const projects = new StaticProjectRegistry([{ id: "dshelm", root: "/srv/projects/dshelm" }]);
  const adapters = new StaticAdapterRegistry([adapter]);
  return { adapter, dispatcher: new GatewayDispatcher({ projects, adapters, now: fixedNow }) };
}

test("authorized dispatch resolves local project and invokes adapter exactly once", async () => {
  const { adapter, dispatcher } = setup();
  const result = await dispatcher.dispatch(baseGrant, baseRequest);

  assert.equal(result.status, "executed");
  assert.equal(result.adapterInvoked, true);
  assert.equal(adapter.calls.length, 1);
  assert.equal(adapter.calls[0]?.project.root, "/srv/projects/dshelm");
  assert.equal(verifyReceipt(result.receipt), true);
  assert.equal(result.receipt.outcome, "success");
});

test("authorized but unregistered project is denied before adapter invocation", async () => {
  const { adapter, dispatcher } = setup();
  const grant = { ...baseGrant, projectIds: ["missing"] };
  const request = { ...baseRequest, projectId: "missing" };
  const result = await dispatcher.dispatch(grant, request);

  assert.equal(result.status, "denied");
  assert.equal(result.denialReason, "project-unregistered");
  assert.equal(result.adapterInvoked, false);
  assert.equal(adapter.calls.length, 0);
  assert.equal(result.receipt.outcome, "denied");
});

test("adapter capability declaration is enforced before execution", async () => {
  const adapter = new FakeAdapter(["agent.delegate"]);
  const { dispatcher } = setup(adapter);
  const grant: CapabilityGrant = { ...baseGrant, capabilities: ["workspace.write"] };
  const request: DelegationRequest = { ...baseRequest, capability: "workspace.write" };
  const result = await dispatcher.dispatch(grant, request);

  assert.equal(result.denialReason, "adapter-capability-mismatch");
  assert.equal(adapter.calls.length, 0);
});

test("identical request replay returns the original receipt without invoking twice", async () => {
  const { adapter, dispatcher } = setup();
  const first = await dispatcher.dispatch(baseGrant, baseRequest);
  const replay = await dispatcher.dispatch(baseGrant, baseRequest);

  assert.equal(first.status, "executed");
  assert.equal(replay.status, "replayed");
  assert.equal(replay.adapterInvoked, false);
  assert.equal(replay.receipt.receiptSha256, first.receipt.receiptSha256);
  assert.equal(adapter.calls.length, 1);
});

test("reusing a request id with different authority or payload is denied as conflict", async () => {
  const adapter = new FakeAdapter();
  const projects = new StaticProjectRegistry([
    { id: "dshelm", root: "/srv/projects/dshelm" },
    { id: "other", root: "/srv/projects/other" },
  ]);
  const dispatcher = new GatewayDispatcher({
    projects,
    adapters: new StaticAdapterRegistry([adapter]),
    now: fixedNow,
  });
  const grant = { ...baseGrant, projectIds: ["dshelm", "other"] };

  await dispatcher.dispatch(grant, baseRequest);
  const conflict = await dispatcher.dispatch(grant, { ...baseRequest, projectId: "other" });

  assert.equal(conflict.status, "denied");
  assert.equal(conflict.denialReason, "request-id-conflict");
  assert.equal(conflict.adapterInvoked, false);
  assert.equal(adapter.calls.length, 1);
});

test("authorization denial occurs before registry and adapter execution", async () => {
  const { adapter, dispatcher } = setup();
  const denied = await dispatcher.dispatch(baseGrant, { ...baseRequest, sessionId: "wrong" });

  assert.equal(denied.status, "denied");
  assert.equal(denied.denialReason, "session-mismatch");
  assert.equal(adapter.calls.length, 0);
  assert.equal(verifyReceipt(denied.receipt), true);
});
