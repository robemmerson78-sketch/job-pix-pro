import type { Clarification, Material, Project, Task } from "./types";

export interface DraftResult {
  description: string;
  tasks: string[];
  /** matchId: id of an existing job line the AI says this item is the same as. */
  materials: Array<{ name: string; qty: number; price: number; matchId?: string | undefined }>;
}

const key = (s: string) => s.trim().toLowerCase();

const STOP = new Set(["and", "for", "the", "with", "per", "each", "gal", "gallon", "box", "pack", "roll", "bag", "set", "kit"]);
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)),
  );

/** Loose "might be the same item" check, used only to route items to review — never to drop or merge. */
export function looksSimilar(a: string, b: string) {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared > 0 && shared / Math.min(A.size, B.size) >= 0.5;
}

/**
 * Merge a fresh AI draft into the job's latest state.
 * - Contractor-owned lines (no `ai` tag: edited, confirmed, excluded, typed or legacy) are kept exactly.
 * - An untouched AI line the fresh draft matches (by id or exact name) is updated in place; a different
 *   price is offered as `aiSuggestedPrice`, never written over the line's price.
 * - Unmatched untouched AI lines are replaced by the fresh suggestions.
 * - A fresh item that loosely resembles a contractor-owned line goes to `pendingDuplicates` for review.
 * - New suggestions arrive as `pending` (left out of totals until confirmed).
 */
export function mergeDraft(
  prev: Project,
  result: DraftResult,
  notesSent: string,
  newId: () => string,
): Pick<
  Project,
  "scope" | "scopeFromAi" | "tasks" | "materials" | "lastDraftNotes" | "pendingDuplicates"
> & {
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
  let pendingDuplicates: Material[] = prev.pendingDuplicates ?? [];
  if (result.materials.length) {
    const owned = prev.materials.filter((m) => !m.ai);
    const updated = new Map<string, Material>();
    const fresh: Material[] = [];
    const review: Material[] = [];
    const seen = new Set<string>();

    for (const item of result.materials) {
      const name = item.name.trim();
      if (!name || seen.has(key(name))) continue;
      seen.add(key(name));
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;

      const target =
        prev.materials.find((m) => item.matchId && m.id === item.matchId) ??
        prev.materials.find((m) => key(m.name) === key(name));

      if (target) {
        // Contractor-owned or already-updated lines are never touched.
        if (!target.ai || updated.has(target.id)) continue;
        updated.set(target.id, {
          ...target,
          name,
          qty,
          aiSuggestedPrice: price && price !== target.price ? price : undefined,
        });
        continue;
      }

      const line: Material = { id: newId(), name, qty, price, ai: true, pending: true };
      if (owned.some((m) => looksSimilar(m.name, name))) review.push(line);
      else fresh.push(line);
    }

    materials = [
      ...prev.materials.flatMap((m) => (!m.ai ? [m] : updated.has(m.id) ? [updated.get(m.id)!] : [])),
      ...fresh,
    ];
    pendingDuplicates = review;
  }

  return {
    scope: replaceScope ? description : prev.scope,
    scopeFromAi: replaceScope ? true : prev.scopeFromAi,
    tasks,
    materials,
    pendingDuplicates,
    lastDraftNotes: notesSent,
    keptScope: !!description && !aiOwnsScope,
  };
}

/** True when the notes no longer match the notes used for the last successful draft. */
export const draftIsStale = (p: Project) =>
  p.lastDraftNotes !== undefined && (p.jobNotes ?? "") !== p.lastDraftNotes;

/** Fingerprint of the inputs a clarification answer depends on. */
export const clarifyFingerprint = (p: Project) =>
  JSON.stringify([
    p.jobNotes ?? "",
    p.photoIds?.length ? p.photoIds : p.photos.length,
    p.materials.map((m) => [m.name, m.qty, m.price, !!m.excluded]),
  ]);

/**
 * Merge freshly asked questions. Answered/skipped questions are kept and not re-asked while the
 * job inputs are unchanged; old open/unsure ones are replaced by the fresh set.
 */
export function mergeClarifications(
  prev: Clarification[],
  fresh: string[],
  fingerprint: string,
  newId: () => string,
): Clarification[] {
  const resolved = prev.filter((c) => c.status === "answered" || c.status === "skipped");
  const settled = new Set(
    resolved.filter((c) => c.askedFor === fingerprint).map((c) => key(c.question)),
  );
  const known = new Set(resolved.map((c) => key(c.question)));
  const next = fresh
    .map((q) => q.trim())
    .filter((q) => q && !settled.has(key(q)))
    .filter((q, i, a) => a.findIndex((x) => key(x) === key(q)) === i)
    .map((question) => ({ id: newId(), question, status: "open" as const }));
  // A re-asked question whose facts changed replaces the old resolved one.
  const reasked = new Set(next.map((c) => key(c.question)).filter((q) => known.has(q)));
  return [...resolved.filter((c) => !reasked.has(key(c.question))), ...next];
}
