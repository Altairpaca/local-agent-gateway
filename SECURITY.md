# Security

Local Agent Gateway is security-sensitive infrastructure. The current repository contains a policy/receipt foundation, not a production-ready remote execution service.

## Security invariants

- authorization is deny-by-default;
- grants bind subject, session, expiry, capabilities, logical projects and target agents;
- remote requests reference logical project IDs rather than raw local filesystem paths;
- local project-ID-to-path mapping is administrator-owned machine state;
- runtime adapters must not broaden the capability granted by the policy kernel;
- execution evidence should be hashed before inclusion in a receipt;
- a runtime is not advertised as supported until it has real integration evidence.

## Threats considered

The design explicitly considers confused-deputy delegation, prompt-injected requests, stale/replayed grants, unauthorized project selection, unauthorized target-agent selection and receipt mutation.

Transport authentication, OS sandboxing, secret storage, key management, tunnel hardening and adapter-specific command safety remain separate controls. A passing policy decision does not make an arbitrary command safe.

## Receipt limitation

`lag.receipt/v1` currently provides integrity checking through a canonical SHA-256 digest. It is not a digital signature and does not prove who produced the receipt. Do not use it as an authentication primitive.

## Reporting

For security reports, avoid filing exploit details in a public issue when disclosure would create immediate risk. Until a private reporting channel is configured, contact the repository owner through the GitHub profile and request a private coordination channel.
