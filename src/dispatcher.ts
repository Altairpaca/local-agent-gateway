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

interface InFlightRequest {
  fingerprint: string;
  promise: Promise<DispatchResult>;
}

export interface GatewayDispatcherOptions {
  projects: ProjectRegistry;
  adapters: AdapterRegistry;
  ledger?: RequestLedger;
  now?: () => Date;
}

function replayFingerprint(grant: CapabilityGrant, request: DelegationRequest): string {
  return sha256Canonical({
    grant: {
      id: grant.id,
      subject: grant.subject,
      sessionId: grant.sessionId,
      issuedAt: grant.issuedAt,
      expiresAt: grant.expiresAt,
      capabilities: [...grant.capabilities].sort(),
      projectIds: [...grant.projectIds].sort(),
      agentIds: [...grant.agentIds].sort(),
    },
    request,
  });
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

function errorEvidence(error: unknown): string {
  if (error instanceof Error) {
    return sha256Canonical({ kind: "adapter-error", name: error.name, message: error.message });
  }
  return sha256Canonical({ kind: "adapter-error", value: String(error) });
}

export class GatewayDispatcher {
  readonly #projects: ProjectRegistry;
  readonly #adapters: AdapterRegistry;
  readonly #ledger: RequestLedger;
  readonly #now: () => Date;
  readonly #inFlight = new Map<string, InFlightRequest>();

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
    const fingerprint = replayFingerprint(grant, request);
    const existing = this.#ledger.get(request.id);
    if (existing) {
      if (existing.fingerprint === fingerprint) return withReplayStatus(existing.result);
      const now = this.#now();
      return denialReceipt(grant, request, authorize(grant, request, now), "request-id-conflict", now);
    }

    const active = this.#inFlight.get(request.id);
    if (active) {
      if (active.fingerprint !== fingerprint) {
        const now = this.#now();
        return denialReceipt(grant, request, authorize(grant, request, now), "request-id-conflict", now);
      }
      return withReplayStatus(await active.promise);
    }

    const promise = this.#dispatchFresh(grant, request, fingerprint, signal);
    this.#inFlight.set(request.id, { fingerprint, promise });
    try {
      return await promise;
    } finally {
      const current = this.#inFlight.get(request.id);
      if (current?.promise === promise) this.#inFlight.delete(request.id);
    }
  }

  async #dispatchFresh(
    grant: CapabilityGrant,
    request: DelegationRequest,
    fingerprint: string,
    signal?: AbortSignal,
  ): Promise<DispatchResult> {
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
    const dispatcherStartedAt = this.#now().toISOString();
    let result: DispatchResult;
    try {
      const execution = await adapter.execute(context);
      result = {
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
    } catch (error: unknown) {
      result = {
        status: "executed",
        authorization,
        adapterInvoked: true,
        receipt: createReceipt({
          request,
          grantId: grant.id,
          startedAt: dispatcherStartedAt,
          finishedAt: this.#now().toISOString(),
          outcome: "failure",
          evidenceSha256: errorEvidence(error),
        }),
      };
    }

    this.#ledger.put(request.id, { fingerprint, result });
    return result;
  }
}
