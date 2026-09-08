# Local Agent Gateway

**A capability broker for secure cloud-to-local agent delegation.**

Local Agent Gateway is designed for workflows where ChatGPT or another cloud agent coordinates work, while Codex, Hermes, OmO or another developer agent executes against the real local machine. The remote caller gets bounded capabilities—not a raw filesystem path or an unrestricted shell.

> Status: early foundation. Authorization, local registries, policy-first dispatch, authority-bound idempotency, tamper-evident receipts and a fail-closed reference adapter kit are implemented. Transports and real local-agent adapters remain separate integration work.

## Core model

```text
remote identity + session
  -> short-lived capability grant
  -> logical project ID + local agent ID
  -> deny-by-default authorization
  -> machine-local project/adapter registries
  -> policy-first dispatcher
  -> local adapter execution
  -> sanitized evidence hash + tamper-evident receipt
```

A remote request cannot select an arbitrary local path. Logical project IDs are resolved by machine-local administrator configuration that stays outside the remote protocol.

## Implemented foundation

- session-bound, expiring capability grants;
- independent capability/project/agent authorization;
- static project and adapter registries with duplicate-ID rejection;
- deny-before-resolve/execute dispatch ordering;
- adapter capability declarations enforced before execution;
- request replay identity bound to normalized full grant authority plus request payload;
- sequential and concurrent identical replay without duplicate adapter execution inside one dispatcher instance;
- request-ID reuse with changed authority/payload denied as `request-id-conflict`;
- adapter exceptions converted into replayable failure receipts instead of becoming unrecorded retry hazards;
- canonical `lag.receipt/v1` execution receipts;
- SHA-256 receipt integrity verification;
- reference adapter whose success evidence is empty unless fields are explicitly whitelisted and whose raw runtime exceptions are hidden by default;
- evidence-layer failures (sanitization, clock integrity, hashing) fail closed rather than being mislabeled as runtime failures;
- deterministic fake-adapter and concurrency tests on Node 20/22.

```bash
npm install
npm run check
npm test
```

## Dispatch semantics

`GatewayDispatcher` is intentionally above runtime-specific adapters. It performs authorization, logical project resolution, adapter lookup, capability checking, idempotency and receipt creation. Runtime adapters do not get to widen the grant or choose a different project root.

A duplicate request ID behaves in one of two ways:

- same normalized grant authority + same request payload: return/join the existing execution and surface the recorded receipt with `status: replayed`, without invoking the adapter again;
- changed grant authority or request payload: return a denied receipt with `request-id-conflict`.

If an authorized adapter invocation throws, the dispatcher records a `failure` receipt and exact replay returns that receipt rather than silently attempting the side effect again.

The in-memory ledger and in-flight map are reference implementations of the semantics, not a production persistence or distributed-coordination claim.

## What this is not

This is not another localhost tunnel, unrestricted MCP shell server, OS sandbox, or multi-agent planner. Existing projects already solve focused ChatGPT-to-Codex bridging and project-scoped MCP access. This project targets the authority and audit layer above individual runtimes.

See [`docs/ADAPTER_DEVELOPMENT.md`](docs/ADAPTER_DEVELOPMENT.md), [`docs/ADAPTER_CONFORMANCE.md`](docs/ADAPTER_CONFORMANCE.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md), and [`docs/V0.2.md`](docs/V0.2.md).

## Planned adapters

- Codex app-server
- Hermes
- OmO
- generic MCP/local tool runtimes

A runtime will only be listed as supported after real local integration evidence exists.

Apache-2.0 licensed.
