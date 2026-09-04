# Local Agent Gateway

**A capability broker for secure cloud-to-local agent delegation.**

Local Agent Gateway is designed for workflows where ChatGPT or another cloud agent coordinates work, while Codex, Hermes, OmO or another developer agent executes against the real local machine. The remote caller gets bounded capabilities—not a raw filesystem path or an unrestricted shell.

> Status: early foundation. v0.1 implements the deterministic authorization and receipt kernel; transports and real local-agent adapters come next.

## Core model

```text
remote identity + session
  -> short-lived capability grant
  -> logical project ID + local agent ID
  -> deny-by-default authorization
  -> local adapter execution
  -> evidence hash + tamper-evident receipt
```

A remote request cannot select an arbitrary local path. Logical project IDs are resolved by machine-local administrator configuration that stays outside the remote protocol.

## Implemented foundation

- session-bound, expiring capability grants;
- independent capability/project/agent authorization;
- deny-by-default policy decisions;
- canonical `lag.receipt/v1` execution receipts;
- SHA-256 receipt integrity verification;
- deterministic tests on Node 20/22.

```bash
npm install
npm run check
npm test
```

## What this is not

This is not another localhost tunnel, unrestricted MCP shell server, OS sandbox, or multi-agent planner. Existing projects already solve focused ChatGPT-to-Codex bridging and project-scoped MCP access well. This project targets the policy and audit layer above individual runtimes.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md).

## Planned adapters

- Codex app-server
- Hermes
- OmO
- generic MCP/local tool runtimes

A runtime will only be listed as supported after real local integration evidence exists.

Apache-2.0 licensed.
