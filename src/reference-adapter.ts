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
  sanitizeDetails?: (
    details: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>>;
  sanitizeFailure?: (error: unknown) => string;
  now?: () => Date;
}

function assertIdentifier(value: string, label: string): void {
  if (!value.trim() || /\s/.test(value)) {
    throw new Error(`${label} must be a non-empty whitespace-free identifier`);
  }
}

function timestamp(now: () => Date): string {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("reference adapter clock must return a valid Date");
  }
  return value.toISOString();
}

function assertMonotonic(startedAt: string, finishedAt: string): void {
  if (Date.parse(finishedAt) < Date.parse(startedAt)) {
    throw new Error("reference adapter clock moved backwards during execution");
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
  const sanitizeDetails = options.sanitizeDetails ?? (() => ({}));
  const sanitizeFailure = options.sanitizeFailure ?? (() => "runtime-error");
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

      const startedAt = timestamp(now);
      try {
        const rawDetails = await options.execute(context);
        const details = sanitizeDetails(rawDetails);
        const finishedAt = timestamp(now);
        assertMonotonic(startedAt, finishedAt);
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
        const finishedAt = timestamp(now);
        assertMonotonic(startedAt, finishedAt);
        const message = sanitizeFailure(error);
        if (!message.trim()) {
          throw new Error("sanitizeFailure must return a non-empty message");
        }
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
