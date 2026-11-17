import { SUPPLIERS, type SupplierKey } from "./settings";
import { deleteAnalysisPhotos } from "./analysis-photos";
import { deletePhotos, isPhotoRef, putPhoto, refId, toRef } from "./photo-store";
import { safeWrite, unreferencedPhotoIds, type SaveResult } from "./storage-core";
import type { Contractor, Project } from "./types";

const PROJECTS_KEY = "cq.projects.v1";
const CONTRACTOR_KEY = "cq.contractor.v1";

const isBrowser = () => typeof window !== "undefined";

export function loadProjects(): Project[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Event fired when a save fails, so the app can warn instead of losing edits silently. */
export const SAVE_FAILED_EVENT = "cq:save-failed";

export function saveProjects(projects: Project[]): SaveResult {
  if (!isBrowser()) return { ok: false, reason: "error" };
  const res = safeWrite(window.localStorage, PROJECTS_KEY, JSON.stringify(projects));
  if (res.ok) window.dispatchEvent(new Event("cq:projects"));
  else window.dispatchEvent(new CustomEvent(SAVE_FAILED_EVENT, { detail: res.reason }));
  return res;
}

export function getProject(id: string): Project | undefined {
  return loadProjects().find((p) => p.id === id);
}

/** Returns false when the device refused the save (the last saved version stays intact). */
export function upsertProject(project: Project): boolean {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const next = { ...project, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  return saveProjects(all).ok;
}

export function deleteProject(id: string) {
  const project = getProject(id);
  const rest = loadProjects().filter((p) => p.id !== id);
  if (!saveProjects(rest).ok) return;
  // Prune the job's sharper analysis copies; failures here never touch saved jobs.
  if (project?.photoIds?.length) void deleteAnalysisPhotos(project.photoIds);
  // Display photos are removed only when no other job (e.g. a duplicate) still uses them.
  if (project) pruneDisplayPhotos(project.photos.filter(isPhotoRef).map(refId), rest);
}

/** Deletes stored display photos that no job uses any more. */
export function pruneDisplayPhotos(ids: string[], projects: Project[] = loadProjects()) {
  const unused = unreferencedPhotoIds(ids, projects);
  if (unused.length) void deletePhotos(unused);
}

/**
 * Stores a new photo in the photo store and returns the reference to keep on the job.
 * Falls back to keeping the photo on the job itself when the photo store is unavailable.
 */
export async function storeDisplayPhoto(dataUrl: string): Promise<string> {
  const id = crypto.randomUUID();
  return (await putPhoto(id, dataUrl)) ? toRef(id) : dataUrl;
}

/**
 * One-time, safe move of photos saved inside older jobs into the photo store, to free space.
 * Each photo is copied and read back before the job is changed; anything that fails stays as it was.
 */
export async function migrateInlinePhotos(): Promise<number> {
  if (!isBrowser()) return 0;
  const all = loadProjects();
  const moved = new Map<string, string>();
  for (const p of all) {
    for (const photo of p.photos) {
      if (isPhotoRef(photo) || !photo.startsWith("data:") || moved.has(photo)) continue;
      const ref = await storeDisplayPhoto(photo);
      if (isPhotoRef(ref)) moved.set(photo, ref);
      else return 0; // photo store unavailable: leave every job untouched
    }
  }
  if (!moved.size) return 0;
  // Re-read so edits made meanwhile are kept; only exact photo matches are swapped.
  const latest = loadProjects().map((p) => ({
    ...p,
    photos: p.photos.map((ph) => moved.get(ph) ?? ph),
  }));
  return saveProjects(latest).ok ? moved.size : 0;
}

export function duplicateProject(id: string): Project | undefined {
  const p = getProject(id);
  if (!p) return;
  const copy: Project = {
    ...p,
    id: crypto.randomUUID(),
    name: `${p.name} (copy)`,
    // Sharper analysis copies belong to the original job; the copy analyses its
    // stored photos instead, so deleting either job can never strip the other.
    photoIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveProjects([copy, ...loadProjects()]);
  return copy;
}

export const defaultContractor: Contractor = {
  name: "",
  business: "",
  phone: "",
  email: "",
  address: "",
  license: "",
};

export function loadContractor(): Contractor {
  if (!isBrowser()) return defaultContractor;
  try {
    const raw = window.localStorage.getItem(CONTRACTOR_KEY);
    return raw ? { ...defaultContractor, ...JSON.parse(raw) } : defaultContractor;
  } catch {
    return defaultContractor;
  }
}

/** Returns false when the device refused the save. */
export function saveContractor(c: Contractor): boolean {
  if (!isBrowser()) return false;
  return safeWrite(window.localStorage, CONTRACTOR_KEY, JSON.stringify(c)).ok;
}

/** Downscale + compress an image file to a storable data URL. */
export function fileToCompressedDataUrl(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Search link for one material at the job's single pricing supplier. */
export const supplierSearchUrl = (term: string, supplier: SupplierKey) =>
  SUPPLIERS[supplier].search(encodeURIComponent(term.trim()));
