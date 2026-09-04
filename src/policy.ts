import type { AuthorizationDecision, CapabilityGrant, DelegationRequest } from "./contracts.js";

export function authorize(
  grant: CapabilityGrant,
  request: DelegationRequest,
  now: Date = new Date(),
): AuthorizationDecision {
  if (grant.subject !== request.subject) {
    return { allowed: false, reason: "subject-mismatch" };
  }
  if (grant.sessionId !== request.sessionId) {
    return { allowed: false, reason: "session-mismatch" };
  }

  const nowMs = now.getTime();
  const issuedAt = Date.parse(grant.issuedAt);
  const expiresAt = Date.parse(grant.expiresAt);
  if (!Number.isFinite(issuedAt) || nowMs < issuedAt) {
    return { allowed: false, reason: "grant-not-yet-valid" };
  }
  if (!Number.isFinite(expiresAt) || nowMs >= expiresAt) {
    return { allowed: false, reason: "grant-expired" };
  }

  if (!grant.capabilities.includes(request.capability)) {
    return { allowed: false, reason: "capability-not-granted" };
  }
  if (!grant.projectIds.includes(request.projectId)) {
    return { allowed: false, reason: "project-not-granted" };
  }
  if (!grant.agentIds.includes(request.agentId)) {
    return { allowed: false, reason: "agent-not-granted" };
  }

  return { allowed: true, reason: "allowed" };
}
