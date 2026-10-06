import { SUPPLIERS, type SupplierKey } from "./settings";
import { deleteAnalysisPhotos } from "./analysis-photos";
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

export function saveProjects(projects: Project[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  window.dispatchEvent(new Event("cq:projects"));
}

export function getProject(id: string): Project | undefined {
  return loadProjects().find((p) => p.id === id);
}

export function upsertProject(project: Project) {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const next = { ...project, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  saveProjects(all);
}

export function deleteProject(id: string) {
  const project = getProject(id);
  saveProjects(loadProjects().filter((p) => p.id !== id));
  // Prune the job's sharper analysis copies; failures here never touch saved jobs.
  if (project?.photoIds?.length) void deleteAnalysisPhotos(project.photoIds);
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

export function saveContractor(c: Contractor) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONTRACTOR_KEY, JSON.stringify(c));
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
