# Local Agent Gateway adapter development

## Adapter responsibility

An adapter connects the gateway authority boundary to a local runtime. It does not replace runtime orchestration policy.

## Lifecycle

1. Declare supported capabilities.
2. Validate requests after gateway authorization.
3. Resolve logical project IDs through local configuration.
4. Execute bounded runtime operations.
5. Emit sanitized evidence receipts.

## Required properties

Adapters should provide:

- explicit capability declarations;
- deterministic failure semantics;
- version/runtime identification;
- receipt-compatible evidence;
- no secret leakage.

## Debugging failures

A failed execution should answer:

- was authorization successful?
- was the project mapping valid?
- was the capability supported?
- did the runtime execute?
- was the failure recorded?

The gateway records authority and evidence boundaries; runtime-specific recovery remains inside the adapter.
