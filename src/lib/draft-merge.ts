import type { Material, Project, Task } from "./types";

export interface DraftResult {
  description: string;
  tasks: string[];
  materials: Array<{ name: string; qty: number; price: number }>;
}

const key = (s: string) => s.trim().toLowerCase();

/**
 * Merge a fresh AI draft into the job's latest state.
 * Untouched AI lines (ai: true) are replaced; contractor-owned lines are kept exactly.
 * Only scope/tasks/materials/ownership fields are returned — nothing else is touched.
 */
export function mergeDraft(
  prev: Project,
  result: DraftResult,
  notesSent: string,
  newId: () => string,
): Pick<Project, "scope" | "scopeFromAi" | "tasks" | "materials" | "lastDraftNotes"> & {
  keptScope: boolean;
} {
  const aiOwnsScope = prev.scopeFromAi === true || !prev.scope.trim();
  const description = result.description.trim();
  const replaceScope = !!description && aiOwnsScope;

  let tasks: Task[] = prev.tasks;
  if (result.tasks.length) {
    const kept = prev.tasks.filter((t) => !t.ai);
    const have = new Set(kept.map((t) => key(t.text)));
    const fresh = result.tasks
      .filter((t) => t.trim() && !have.has(key(t)))
      .map((text) => ({ id: newId(), text, ai: true as const }));
    tasks = [...kept, ...fresh];
  }

  let materials: Material[] = prev.materials;
  if (result.materials.length) {
    const kept = prev.materials.filter((m) => !m.ai);
    const have = new Set(kept.map((m) => key(m.name)));
    const fresh = result.materials
      .filter((m) => m.name.trim() && !have.has(key(m.name)))
      .map((m) => ({
        id: newId(),
        name: m.name,
        qty: m.qty || 1,
        price: m.price || 0,
        ai: true as const,
      }));
    materials = [...kept, ...fresh];
  }

  return {
    scope: replaceScope ? description : prev.scope,
    scopeFromAi: replaceScope ? true : prev.scopeFromAi,
    tasks,
    materials,
    lastDraftNotes: notesSent,
    keptScope: !!description && !aiOwnsScope,
  };
}

/** True when the notes no longer match the notes used for the last successful draft. */
export const draftIsStale = (p: Project) =>
  p.lastDraftNotes !== undefined && (p.jobNotes ?? "") !== p.lastDraftNotes;
