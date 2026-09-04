import { createHash } from "node:crypto";
import { RECEIPT_SCHEMA_VERSION, type ExecutionReceipt, type ReceiptInput } from "./contracts.js";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  throw new TypeError(`Unsupported receipt value: ${typeof value}`);
}

export function createReceipt(input: ReceiptInput): ExecutionReceipt {
  if (!/^[0-9a-f]{64}$/i.test(input.evidenceSha256)) {
    throw new Error("evidenceSha256 must be a 64-character SHA-256 hex digest");
  }

  const startedAt = Date.parse(input.startedAt);
  const finishedAt = Date.parse(input.finishedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt < startedAt) {
    throw new Error("receipt timestamps must be valid and finishedAt must not precede startedAt");
  }

  const unsigned = { schemaVersion: RECEIPT_SCHEMA_VERSION, ...input };
  const receiptSha256 = createHash("sha256").update(canonicalJson(unsigned)).digest("hex");
  return { ...unsigned, receiptSha256 };
}

export function verifyReceipt(receipt: ExecutionReceipt): boolean {
  const { receiptSha256, ...unsigned } = receipt;
  const expected = createHash("sha256").update(canonicalJson(unsigned)).digest("hex");
  return expected === receiptSha256;
}
