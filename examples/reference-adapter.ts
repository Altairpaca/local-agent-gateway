import { createReferenceAdapter } from "../src/index.js";

export const referenceAdapter = createReferenceAdapter({
  id: "example-readonly",
  capabilities: ["workspace.read"],
  execute: async ({ request, project }) => ({
    requestId: request.id,
    projectId: project.id,
    operation: "fixture-read",
    localRoot: project.root,
  }),
  // Evidence is fail-closed: only explicitly whitelisted fields may leave the adapter.
  sanitizeDetails: ({ requestId, projectId, operation }) => ({ requestId, projectId, operation }),
  sanitizeFailure: () => "runtime-unavailable",
});
