# Reference adapter kit

`createReferenceAdapter()` is a deterministic onboarding primitive for runtime integrations. It is intentionally not a shell adapter and does not discover local runtimes.

A production adapter should first prove its capability declaration, error shaping, cancellation boundary, and evidence hashing against this contract. Runtime-specific protocol work then stays inside the adapter implementation.

## Required boundary

- declare the smallest capability set the runtime actually supports;
- accept only administrator-resolved `project.root` values from the gateway;
- never reinterpret remote data as a new filesystem root or credential source;
- return sanitized details only;
- convert runtime failures to bounded failure evidence;
- leave user/runtime approval semantics to the runtime authority.

The reference adapter hashes `{adapterId, requestId, projectId, capability, details}` for success evidence and the same bounded identity plus the sanitized error string for failure evidence.

This provides a CI-testable conformance target before a Codex/Hermes/OmO adapter is exercised on a real machine.
