# Local Agent Gateway

**A capability broker for secure cloud-to-local agent delegation.**

Local Agent Gateway is designed for workflows where ChatGPT or another cloud agent coordinates work, while Codex, Hermes, OmO or another developer agent executes against the real local machine. The remote caller gets bounded capabilities—not a raw filesystem path or an unrestricted shell.

> Status: early v0.2 foundation. Authorization, local registries, policy-first dispatch, idempotent request handling and tamper-evident receipts are implemented. Transports and real local-agent adapters remain separate integration work.

## Core model

```text
remote identity + session
  -> short-lived capability grant
  -> logical project ID + local agent ID
  -> deny-by-default authorization
  -> machine-local project/adapter registries
  -> policy-first dispatcher
  -> local adapter execution
  -> evidence hash + tamper-evident receipt
```

A remote request cannot select an arbitrary local path. Logical project IDs are resolved by machine-local administrator configuration that stays outside the remote protocol.

## Implemented foundation

- session-bound, expiring capability grants;
- independent capability/project/agent authorization;
- static project and adapter registries with duplicate-ID rejection;
- deny-before-resolve/execute dispatch ordering;
- adapter capability declarations enforced before execution;
- request-ID idempotency: exact replay returns the original receipt without re-executing;
- request-ID reuse with changed authority/payload is denied;
- canonical `lag.receipt/v1` execution receipts;
- SHA-256 receipt integrity verification;
- deterministic fake-adapter tests on Node 20/22.

```bash
npm install
npm run check
npm test
```

## Dispatch semantics

`GatewayDispatcher` is intentionally above runtime-specific adapters. It performs authorization, logical project resolution, adapter lookup, capability checking, idempotency and receipt creation. Runtime adapters do not get to widen the grant or choose a different project root.

A duplicate request ID behaves in one of two ways:

- same grant + same request payload: return the previously recorded receipt with `status: replayed` and do not invoke the adapter again;
- changed grant or request payload: return a denied receipt with `request-id-conflict`.

The in-memory ledger is a reference implementation of semantics, not a production persistence claim.

## What this is not

This is not another localhost tunnel, unrestricted MCP shell server, OS sandbox, or multi-agent planner. Existing projects already solve focused ChatGPT-to-Codex bridging and project-scoped MCP access. This project targets the authority and audit layer above individual runtimes.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md), and [`docs/V0.2.md`](docs/V0.2.md).

## Planned adapters

- Codex app-server
- Hermes
- OmO
- generic MCP/local tool runtimes

A runtime will only be listed as supported after real local integration evidence exists.

Apache-2.0 licensed.
