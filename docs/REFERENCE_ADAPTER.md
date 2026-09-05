# Reference adapter kit

`createReferenceAdapter()` is a deterministic onboarding primitive for runtime integrations. It is intentionally not a shell adapter and does not discover local runtimes.

A production adapter should first prove its capability declaration, error shaping, cancellation boundary, and evidence hashing against this contract. Runtime-specific protocol work then stays inside the adapter implementation.

## Required boundary

- declare the smallest capability set the runtime actually supports;
- accept only administrator-resolved `project.root` values from the gateway;
- never reinterpret remote data as a new filesystem root or credential source;
- never emit executor details unless `sanitizeDetails` explicitly whitelists them;
- never emit a raw runtime exception unless `sanitizeFailure` deliberately converts it to bounded public evidence;
- reject an invalid/backwards adapter clock rather than minting inconsistent receipts;
- leave user/runtime approval semantics to the runtime authority.

## Fail-closed evidence defaults

The reference adapter now treats redaction as code, not documentation:

- default success details are `{}`;
- default failure detail is `{ "error": "runtime-error" }`;
- `sanitizeDetails` is the only path for success metadata to leave the adapter;
- `sanitizeFailure` is the only path for a more specific failure reason to leave the adapter.

The evidence digest is calculated only after sanitization, over `{adapterId, requestId, projectId, capability, details|error}`. This prevents a receipt hash from becoming a covert commitment to secrets that were removed from the visible response.

This provides a CI-testable conformance target before a Codex/Hermes/OmO adapter is exercised on a real machine.
