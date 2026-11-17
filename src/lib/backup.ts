/** Browser side of backup export/restore. */
import { APP_NAME, APP_VERSION } from "./app-info";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  planImport,
  type Backup,
  type ImportPlan,
} from "./backup-core";
import { isPhotoRef, resolvePhotos } from "./photo-store";
import { loadPreferences, loadQuoteDefaults, savePreferences, saveQuoteDefaults } from "./settings";
import {
  loadContractor,
  loadProjects,
  saveContractor,
  saveProjects,
  storeDisplayPhoto,
} from "./storage";

/** Builds a full backup. Photos are included as image data (can be large). */
export async function buildBackup(): Promise<Backup> {
  let missing = 0;
  const projects = [];
  for (const p of loadProjects()) {
    const photos = await resolvePhotos(p.photos);
    missing += photos.filter((x) => !x).length;
    projects.push({ ...p, photos: photos.filter(Boolean) });
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: APP_NAME,
    appVersion: APP_VERSION,
    projects,
    contractor: loadContractor(),
    preferences: loadPreferences(),
    quoteDefaults: loadQuoteDefaults(),
    missingPhotos: missing,
  };
}

export async function downloadBackup(): Promise<{
  jobs: number;
  photos: number;
  missing: number;
  bytes: number;
}> {
  const b = await buildBackup();
  const text = JSON.stringify(b);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobpix-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return {
    jobs: b.projects.length,
    photos: b.projects.reduce((n, p) => n + p.photos.length, 0),
    missing: b.missingPhotos ?? 0,
    bytes: blob.size,
  };
}

export function previewImport(b: Backup): ImportPlan {
  return planImport(loadProjects(), b.projects, () => crypto.randomUUID());
}

/**
 * Applies a confirmed import. Existing jobs are never changed. Photos go to the photo store first,
 * so the job list stays small; if the final save is refused, nothing is imported.
 */
export async function applyImport(
  b: Backup,
  plan: ImportPlan,
  restoreSettings: boolean,
): Promise<{ ok: boolean; jobs: number; settingsRestored: boolean }> {
  const incoming = [...plan.added, ...plan.copies];
  const prepared = [];
  for (const p of incoming) {
    const photos = [];
    for (const ph of p.photos) photos.push(isPhotoRef(ph) ? ph : await storeDisplayPhoto(ph));
    prepared.push({ ...p, photos });
  }
  const res = saveProjects([...prepared, ...loadProjects()]);
  if (!res.ok) return { ok: false, jobs: 0, settingsRestored: false };
  let settingsRestored = false;
  if (restoreSettings) {
    const okC = b.contractor ? saveContractor({ ...loadContractor(), ...b.contractor }) : true;
    const okP = b.preferences ? savePreferences({ ...loadPreferences(), ...b.preferences }) : true;
    const okD = b.quoteDefaults
      ? saveQuoteDefaults({ ...loadQuoteDefaults(), ...b.quoteDefaults })
      : true;
    settingsRestored = okC && okP && okD;
  }
  return { ok: true, jobs: prepared.length, settingsRestored };
}
