# Adapter conformance contract

Runtime adapters plug into an authority boundary, not a generic shell proxy. A conforming adapter must preserve the following invariants before it can be promoted to a real-runtime claim.

## Static contract

- stable, whitespace-free adapter ID;
- smallest declared capability set;
- no duplicate capabilities;
- consumes administrator-resolved projects rather than remote filesystem roots;
- never creates new model/auth/sandbox authority from request payloads.

## Execution contract

1. Gateway authorization and project resolution happen before invocation.
2. Runtime executor is called only for a capability the adapter declared.
3. Success evidence is fail-closed: executor details are discarded unless an explicit `sanitizeDetails` function whitelists fields.
4. Runtime exceptions are reduced to `runtime-error` unless an explicit `sanitizeFailure` function emits a bounded reason.
5. Evidence-layer failures (sanitization, timestamp integrity, hashing) are **not** converted into runtime failure receipts; they reject the adapter result.
6. Receipt timestamps must be valid and monotonic.
7. Evidence hashes commit only to sanitized public evidence.
8. An already-aborted signal fails before runtime work starts.

## Why the distinction matters

A raw exception may contain credentials, local paths, URLs, command lines or provider payloads. A raw success object can be equally sensitive. Hashing those values before redaction is also undesirable because a supposedly public receipt would still commit to undisclosed secret material.

The reference adapter therefore defaults to zero success details and a generic runtime failure. More detailed evidence requires an explicit sanitizer that can be reviewed and tested.

## Non-goal

Model selection, fallback, planning and runtime orchestration remain outside the gateway. Passing this contract proves adapter boundary compatibility, not Codex/Hermes/OmO compatibility.

## Real-runtime promotion

A Codex/Hermes/OmO adapter still requires the existing `LOCAL-VERIFY` evidence for protocol version, approval/cancellation semantics and runtime-specific failure behavior. CI can prove the authority/evidence contract; it cannot manufacture claims about a binary or account that was never exercised.
