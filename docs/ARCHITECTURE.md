# Architecture

Local Agent Gateway is a capability broker between a remote/cloud agent session and local execution agents. The core does not expose an unrestricted shell or filesystem API.

## Control flow

```text
cloud agent / MCP client
        |
        v
transport adapter
        |
        v
identity + session binding
        |
        v
capability grant policy  ---- deny by default
        |
        v
logical project ID + target agent ID
        |
        v
local administrator registry
        |
        v
Codex / Hermes / OmO / other adapter
        |
        v
bounded evidence -> execution receipt
```

## Why logical project IDs

A remote caller should not select `/home/user/...` paths. It requests a logical project such as `dshelm`. A local administrator-owned registry resolves that ID to a real path and runtime policy. This separates remote intent from local filesystem authority and avoids making path normalization the primary security boundary.

The registry itself is intentionally outside the v0.1 pure policy kernel because it is machine-local state.

## Grants

A grant binds all of the following:

- subject identity;
- session ID;
- issue and expiry time;
- explicit capabilities;
- allowed logical project IDs;
- allowed local agent IDs.

A request that mismatches any dimension is denied.

## Receipts

Execution adapters return evidence. The gateway records a receipt containing the request identity, grant ID, timestamps, outcome and evidence hash. v0.1 receipts are tamper-evident through a canonical SHA-256 digest; they are **not cryptographically authenticated signatures**. Key-backed signatures are a later design decision.

## Adapter boundary

Adapters own host-specific mechanics such as:

- Codex app-server protocol;
- Hermes command/session APIs;
- OmO orchestration invocation;
- MCP transport details;
- local approval prompts;
- process lifecycle and cancellation.

The policy kernel should not absorb those protocols. This keeps authorization deterministic and testable in CI while real-host behavior is verified on the user's machine.

## Non-goals

- replacing an OS sandbox;
- exposing arbitrary shell/filesystem tools to every remote client;
- implementing another multi-agent planner;
- owning Secure MCP Tunnel or equivalent transport infrastructure;
- reselling model credentials or subscription access.
