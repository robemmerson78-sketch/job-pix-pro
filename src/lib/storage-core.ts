/** Pure storage helpers (no browser globals) so the safety rules can be tested. */
import type { Project } from "./types";
import { isPhotoRef, refId } from "./photo-store-refs";

export interface KV {
  setItem(key: string, value: string): void;
}

export type SaveResult = { ok: true } | { ok: false; reason: "full" | "error" };

/** Writes once; a failure leaves the previously saved value in place. Never throws. */
export function safeWrite(kv: KV, key: string, value: string): SaveResult {
  try {
    kv.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    const full = /quota/i.test(name) || /quota/i.test(String((e as Error)?.message ?? ""));
    return { ok: false, reason: full ? "full" : "error" };
  }
}

/** Photo store ids no longer used by any job (safe to delete). Duplicated jobs share photos. */
export function unreferencedPhotoIds(candidates: string[], projects: Project[]): string[] {
  const used = new Set(projects.flatMap((p) => p.photos.filter(isPhotoRef).map(refId)));
  return candidates.filter((id) => !used.has(id));
}
