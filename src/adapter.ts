import type { Capability, DelegationRequest } from "./contracts.js";

export interface ResolvedProject {
  id: string;
  root: string;
}

export interface AdapterExecutionContext {
  request: DelegationRequest;
  project: ResolvedProject;
  signal?: AbortSignal;
}

export interface AdapterExecutionResult {
  outcome: "success" | "failure";
  startedAt: string;
  finishedAt: string;
  evidenceSha256: string;
  details?: Readonly<Record<string, unknown>>;
}

export interface LocalAgentAdapter {
  readonly id: string;
  readonly capabilities: readonly Capability[];
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult>;
}
