import { createReferenceAdapter } from "../src/index.js";

export const referenceAdapter = createReferenceAdapter({
  id: "example-readonly",
  capabilities: ["workspace.read"],
  execute: async ({ request, project }) => ({
    requestId: request.id,
    projectId: project.id,
    operation: "fixture-read",
  }),
});
