# Landscape and differentiation

Snapshot: 2026-09-04.

Several community projects already connect ChatGPT or MCP clients to local developer environments. Local Agent Gateway should compose with those ideas rather than reimplement a thin tunnel or project-scoped shell server.

## Existing approaches

- [`joseanu/codex-from-chatgpt`](https://github.com/joseanu/codex-from-chatgpt) provides a focused ChatGPT -> Secure MCP Tunnel -> MCP -> Codex app-server bridge with job lifecycle and approval handling.
- [`harukary/local-dev-mcp`](https://github.com/harukary/local-dev-mcp) provides registered project roots, denied paths, shell-risk classification, redaction, OAuth and controlled HTTP MCP access for local development projects.

Those repositories already demonstrate that "make localhost reachable by ChatGPT" and "restrict a local project MCP server" are viable product shapes.

## Gap targeted here

Local Agent Gateway targets a higher-level, multi-runtime delegation boundary:

```text
remote identity/session
  -> short-lived capability grant
  -> logical project + target local agent
  -> adapter-specific execution
  -> auditable evidence receipt
```

The intended differentiators are:

1. remote callers do not choose raw filesystem roots;
2. grants are explicitly session-bound and expire;
3. capabilities, projects and target agents are authorized independently;
4. Codex, Hermes, OmO and other local runtimes are adapters rather than hard-coded product identity;
5. every delegated execution can produce a stable evidence receipt;
6. transport/tunnel choice is separated from authorization and execution policy.

## Product boundary with DSHelm

DSHelm decides **which model/provider/configuration should handle a role or task**.

Local Agent Gateway decides **whether a remote session is allowed to delegate a concrete capability into a local execution environment and how that action is evidenced**.

The two may integrate later, but routing policy and machine authority should remain separate trust domains.
