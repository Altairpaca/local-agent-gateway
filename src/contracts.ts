export const RECEIPT_SCHEMA_VERSION = "lag.receipt/v1" as const;

export type Capability =
  | "workspace.read"
  | "workspace.write"
  | "process.exec"
  | "network.outbound"
  | "agent.delegate";

export interface CapabilityGrant {
  id: string;
  subject: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
  capabilities: readonly Capability[];
  projectIds: readonly string[];
  agentIds: readonly string[];
}

export interface DelegationRequest {
  id: string;
  subject: string;
  sessionId: string;
  capability: Capability;
  projectId: string;
  agentId: string;
}

export type AuthorizationDenialReason =
  | "grant-not-yet-valid"
  | "grant-expired"
  | "subject-mismatch"
  | "session-mismatch"
  | "capability-not-granted"
  | "project-not-granted"
  | "agent-not-granted";

export type AuthorizationDecision =
  | { allowed: true; reason: "allowed" }
  | { allowed: false; reason: AuthorizationDenialReason };

export interface ReceiptInput {
  request: DelegationRequest;
  grantId: string;
  startedAt: string;
  finishedAt: string;
  outcome: "success" | "failure" | "denied";
  evidenceSha256: string;
}

export interface ExecutionReceipt extends ReceiptInput {
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  receiptSha256: string;
}

export type DispatchDenialReason =
  | AuthorizationDenialReason
  | "project-unregistered"
  | "agent-unregistered"
  | "adapter-capability-mismatch"
  | "request-id-conflict";

export interface DispatchResult {
  status: "executed" | "denied" | "replayed";
  authorization: AuthorizationDecision;
  receipt: ExecutionReceipt;
  denialReason?: DispatchDenialReason;
  adapterInvoked: boolean;
}
