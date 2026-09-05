# Adapter conformance

Before runtime-specific live verification, an adapter contribution should satisfy these CI-testable checks:

1. **Identity** — stable non-empty adapter ID and explicit capability declaration.
2. **Authority** — request capability must be declared by the adapter; project roots arrive only from the local registry.
3. **Evidence** — success/failure details are sanitized and content-addressed.
4. **Failure shaping** — runtime exceptions become bounded failure evidence rather than fabricated success.
5. **Cancellation** — an already-aborted signal fails before runtime work starts.
6. **No orchestration policy** — model selection, fallback, and planning remain outside the gateway.

Real runtime support claims still require the existing `LOCAL-VERIFY` issues. Passing this checklist proves adapter contract compatibility, not Codex/Hermes/OmO compatibility.
