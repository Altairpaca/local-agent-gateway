# Contributing to Local Agent Gateway

Local Agent Gateway treats authorization, local project resolution and execution as separate authority boundaries. Contributions must preserve that separation.

## Core invariants

Changes to policy, dispatch, registry or receipt logic must preserve these rules:

- remote requests identify logical projects; they do not choose arbitrary local roots;
- authorization occurs before project resolution or adapter execution;
- adapters cannot widen the grant they receive;
- unsupported adapter capabilities are denied before execution;
- exact request replays do not cause duplicate execution within the defined dispatcher/ledger semantics;
- request IDs cannot be rebound to changed authority or payload;
- receipts are integrity evidence, not identity signatures.

Every deterministic change requires tests in GitHub Actions.

## Runtime adapter contributions

A Codex, Hermes, OmO or other runtime adapter must be based on behavior actually exercised against a named runtime/version before the README claims support.

Required evidence:

- runtime/version exercised;
- supported capability mapping;
- one successful bounded path;
- denied paths proving the gateway enforces authority before execution;
- sanitized error/cancellation/approval semantics;
- no credentials or private local configuration in committed output.

Deterministic protocol parsing should be represented by fixtures and moved into normal CI.

## Pull request contract

A PR should state:

1. **Problem** — what authority, reliability or audit gap is addressed?
2. **Scope / non-goals** — especially what remains the responsibility of the runtime or transport.
3. **Threat boundary** — what the caller can and cannot control after the change.
4. **Acceptance** — deterministic tests and, for runtime integrations, sanitized real evidence.
5. **Failure behavior** — how denial, cancellation, adapter failure or replay is represented.

## Product boundaries

The gateway is not a generic shell server, a replacement agent orchestrator, a model router or an operating-system sandbox. Keep runtime-specific planning/orchestration policy inside the runtime unless a capability boundary requires otherwise.

## Security

Do not commit secrets, OAuth/session material, cookies, private project contents, account identifiers or unrestricted filesystem paths from a user's machine. Security-sensitive shortcuts that weaken grants, project scopes, approval or transport identity should be rejected rather than hidden behind a configuration flag.

Apache-2.0 applies to contributions unless explicitly stated otherwise.
