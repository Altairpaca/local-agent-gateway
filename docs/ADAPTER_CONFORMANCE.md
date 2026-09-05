# Adapter conformance contract

A runtime adapter is a bounded execution endpoint inside the gateway authority model.

- identity and capabilities are explicit;
- project roots come only from the machine-local registry;
- success details are empty unless explicitly whitelisted;
- raw runtime exceptions are hidden by default;
- evidence hashes commit only to sanitized public evidence;
- evidence-layer integrity failures reject the result rather than becoming runtime failures;
- already-aborted requests fail before runtime work begins;
- orchestration/model policy remains outside the gateway.

Passing this contract proves the adapter boundary, not real Codex/Hermes/OmO compatibility. Those claims require local runtime evidence.
