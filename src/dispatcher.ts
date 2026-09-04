import type { LocalAgentAdapter } from "./adapter.js";
import type {
  AuthorizationDecision,
  CapabilityGrant,
  DelegationRequest,
  DispatchDenialReason,
  DispatchResult,
} from "./contracts.js";
import { authorize } from "./policy.js";
import { createReceipt, sha256Canonical } from "./receipt.js";
import type { AdapterRegistry, ProjectRegistry } from "./registry.js";

export interface RequestLedgerEntry {
  fingerprint: string;
  result: DispatchResult;
}

export interface RequestLedger {
  get(requestId: string): RequestLedgerEntry | undefined;
  put(requestId: string, entry: RequestLedgerEntry): void;
}

export class InMemoryRequestLedger implements RequestLedger {
  readonly #entries = new Map<string, RequestLedgerEntry>();

  get(requestId: string): RequestLedgerEntry | undefined {
    return this.#entries.get(requestId);
  }

  put(requestId: string, entry: RequestLedgerEntry): void {
    if (this.#entries.has(requestId)) throw new Error(`request id already recorded: ${requestId}`);
    this.#entries.set(requestId, entry);
  }
}

export interface GatewayDispatcherOptions {
  projects: ProjectRegistry;
  adapters: AdapterRegistry;
  ledger?: RequestLedger;
  now?: () => Date;
}

function withReplayStatus(result: DispatchResult): DispatchResult {
  const replayed: DispatchResult = {
    status: "replayed",
    authorization: result.authorization,
    receipt: result.receipt,
    adapterInvoked: false,
  };
  if (result.denialReason !== undefined) replayed.denialReason = result.denialReason;
  return replayed;
}

function denialReceipt(
  grant: CapabilityGrant,
  request: DelegationRequest,
  authorization: AuthorizationDecision,
  reason: DispatchDenialReason,
  now: Date,
): DispatchResult {
  const timestamp = now.toISOString();
  return {
    status: "denied",
    authorization,
    denialReason: reason,
    adapterInvoked: false,
    receipt: createReceipt({
      request,
      grantId: grant.id,
      startedAt: timestamp,
      finishedAt: timestamp,
      outcome: "denied",
      evidenceSha256: sha256Canonical({ kind: "gateway-denial", reason, request }),
    }),
  };
}

function adapterSupports(adapter: LocalAgentAdapter, request: DelegationRequest): boolean {
  return adapter.capabilities.includes(request.capability);
}

export class GatewayDispatcher {
  readonly #projects: ProjectRegistry;
  readonly #adapters: AdapterRegistry;
  readonly #ledger: RequestLedger;
  readonly #now: () => Date;

  constructor(options: GatewayDispatcherOptions) {
    this.#projects = options.projects;
    this.#adapters = options.adapters;
    this.#ledger = options.ledger ?? new InMemoryRequestLedger();
    this.#now = options.now ?? (() => new Date());
  }

  async dispatch(
    grant: CapabilityGrant,
    request: DelegationRequest,
    signal?: AbortSignal,
  ): Promise<DispatchResult> {
    const fingerprint = sha256Canonical({ grantId: grant.id, request });
    const existing = this.#ledger.get(request.id);
    if (existing) {
      if (existing.fingerprint === fingerprint) return withReplayStatus(existing.result);
      const now = this.#now();
      const authorization = authorize(grant, request, now);
      return denialReceipt(grant, request, authorization, "request-id-conflict", now);
    }

    const now = this.#now();
    const authorization = authorize(grant, request, now);
    if (!authorization.allowed) {
      const result = denialReceipt(grant, request, authorization, authorization.reason, now);
      this.#ledger.put(request.id, { fingerprint, result });
      return result;
    }

    const project = this.#projects.resolve(request.projectId);
    if (!project) {
      const result = denialReceipt(grant, request, authorization, "project-unregistered", now);
      this.#ledger.put(request.id, { fingerprint, result });
      return result;
    }

    const adapter = this.#adapters.resolve(request.agentId);
    if (!adapter) {
      const result = denialReceipt(grant, request, authorization, "agent-unregistered", now);
      this.#ledger.put(request.id, { fingerprint, result });
      return result;
    }

    if (!adapterSupports(adapter, request)) {
      const result = denialReceipt(grant, request, authorization, "adapter-capability-mismatch", now);
      this.#ledger.put(request.id, { fingerprint, result });
      return result;
    }

    const context = signal === undefined ? { request, project } : { request, project, signal };
    const execution = await adapter.execute(context);
    const result: DispatchResult = {
      status: "executed",
      authorization,
      adapterInvoked: true,
      receipt: createReceipt({
        request,
        grantId: grant.id,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        outcome: execution.outcome,
        evidenceSha256: execution.evidenceSha256,
      }),
    };
    this.#ledger.put(request.id, { fingerprint, result });
    return result;
  }
}
