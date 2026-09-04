import type { LocalAgentAdapter, ResolvedProject } from "./adapter.js";

export interface ProjectRegistry {
  resolve(projectId: string): ResolvedProject | undefined;
}

export interface AdapterRegistry {
  resolve(agentId: string): LocalAgentAdapter | undefined;
}

function assertLogicalId(id: string, kind: string): void {
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(id)) {
    throw new Error(`${kind} id must be a non-empty logical identifier`);
  }
}

export class StaticProjectRegistry implements ProjectRegistry {
  readonly #projects: ReadonlyMap<string, ResolvedProject>;

  constructor(projects: readonly ResolvedProject[]) {
    const entries = new Map<string, ResolvedProject>();
    for (const project of projects) {
      assertLogicalId(project.id, "project");
      if (!project.root.trim()) throw new Error(`project root must be non-empty: ${project.id}`);
      if (entries.has(project.id)) throw new Error(`duplicate project id: ${project.id}`);
      entries.set(project.id, Object.freeze({ ...project }));
    }
    this.#projects = entries;
  }

  resolve(projectId: string): ResolvedProject | undefined {
    const project = this.#projects.get(projectId);
    return project ? { ...project } : undefined;
  }
}

export class StaticAdapterRegistry implements AdapterRegistry {
  readonly #adapters: ReadonlyMap<string, LocalAgentAdapter>;

  constructor(adapters: readonly LocalAgentAdapter[]) {
    const entries = new Map<string, LocalAgentAdapter>();
    for (const adapter of adapters) {
      assertLogicalId(adapter.id, "agent");
      if (entries.has(adapter.id)) throw new Error(`duplicate agent id: ${adapter.id}`);
      entries.set(adapter.id, adapter);
    }
    this.#adapters = entries;
  }

  resolve(agentId: string): LocalAgentAdapter | undefined {
    return this.#adapters.get(agentId);
  }
}
