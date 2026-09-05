import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  LocalAgentAdapter,
} from "./adapter.js";
import type { Capability } from "./contracts.js";
import { sha256Canonical } from "./receipt.js";

export interface ReferenceAdapterOptions {
  id: string;
  capabilities: readonly Capability[];
  execute: (context: AdapterExecutionContext) => Promise<Readonly<Record<string, unknown>>>;
  now?: () => Date;
}

function assertIdentifier(value: string, label: string): void {
  if (!value.trim() || /\s/.test(value)) {
    throw new Error(`${label} must be a non-empty whitespace-free identifier`);
  }
}

export function createReferenceAdapter(options: ReferenceAdapterOptions): LocalAgentAdapter {
  assertIdentifier(options.id, "adapter id");
  if (options.capabilities.length === 0) {
    throw new Error("reference adapter must declare at least one capability");
  }
  if (new Set(options.capabilities).size !== options.capabilities.length) {
    throw new Error("reference adapter capabilities must be unique");
  }

  const now = options.now ?? (() => new Date());
  const capabilities = Object.freeze([...options.capabilities]);

  return Object.freeze({
    id: options.id,
    capabilities,
    async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
      if (!capabilities.includes(context.request.capability)) {
        throw new Error(`adapter ${options.id} cannot execute capability ${context.request.capability}`);
      }
      if (context.signal?.aborted) {
        throw new Error("adapter execution aborted before start");
      }

      const startedAt = now().toISOString();
      try {
        const details = await options.execute(context);
        const finishedAt = now().toISOString();
        return {
          outcome: "success",
          startedAt,
          finishedAt,
          evidenceSha256: sha256Canonical({
            adapterId: options.id,
            requestId: context.request.id,
            projectId: context.project.id,
            capability: context.request.capability,
            details,
          }),
          details,
        };
      } catch (error) {
        const finishedAt = now().toISOString();
        const message = error instanceof Error ? error.message : "unknown adapter failure";
        return {
          outcome: "failure",
          startedAt,
          finishedAt,
          evidenceSha256: sha256Canonical({
            adapterId: options.id,
            requestId: context.request.id,
            projectId: context.project.id,
            capability: context.request.capability,
            error: message,
          }),
          details: { error: message },
        };
      }
    },
  });
}
