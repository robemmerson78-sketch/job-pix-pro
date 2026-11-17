/** Backup file format and import planning. Pure (no browser APIs) so it can be tested. */
import { z } from "zod";

import type { Contractor, Project } from "./types";
import type { Preferences, QuoteDefaults } from "./settings";

export const BACKUP_FORMAT = "jobpix-backup";
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  app: string;
  appVersion: string;
  projects: Project[];
  contractor?: Contractor;
  preferences?: Preferences;
  quoteDefaults?: QuoteDefaults;
  /** Photos that could not be read on the exporting device. */
  missingPhotos?: number;
}

const ProjectShape = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    photos: z.array(z.string()).default([]),
    tasks: z.array(z.object({ id: z.string(), text: z.string() }).passthrough()).default([]),
    materials: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            qty: z.coerce.number(),
            price: z.coerce.number(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

const BackupShape = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.number().int().min(1),
    exportedAt: z.string().optional(),
    projects: z.array(ProjectShape),
    contractor: z.record(z.string(), z.unknown()).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    quoteDefaults: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** Fills fields a job needs so older or partial backups load like normal jobs. */
function normalizeProject(raw: Record<string, unknown>): Project {
  const now = Date.now();
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...(raw as unknown as Project),
    client: str(raw["client"]),
    address: str(raw["address"]),
    type: raw["type"] === "invoice" ? "invoice" : "quote",
    createdAt: num(raw["createdAt"], now),
    updatedAt: num(raw["updatedAt"], now),
    scope: str(raw["scope"]),
    notes: str(raw["notes"]),
    laborHours: num(raw["laborHours"], 0),
    laborRate: num(raw["laborRate"], 0),
    taxPercent: num(raw["taxPercent"], 0),
    // Only real image data or photo-store references are accepted as photos.
    photos: ((raw["photos"] as string[]) ?? []).filter((p) => p.startsWith("data:image/")),
  };
}

export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a JobPix backup (it can't be read)." };
  }
  const fmt = (json as { format?: unknown })?.format;
  if (fmt !== BACKUP_FORMAT) return { ok: false, error: "This file isn't a JobPix backup." };
  const ver = (json as { version?: unknown }).version;
  if (typeof ver === "number" && ver > BACKUP_VERSION)
    return {
      ok: false,
      error: "This backup was made by a newer version of JobPix. Update the app and try again.",
    };
  const parsed = BackupShape.safeParse(json);
  if (!parsed.success)
    return { ok: false, error: "This backup is damaged or incomplete, so nothing was imported." };
  const b = parsed.data;
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: b.version,
      exportedAt: b.exportedAt ?? "",
      app: String((b as Record<string, unknown>)["app"] ?? "JobPix"),
      appVersion: String((b as Record<string, unknown>)["appVersion"] ?? ""),
      projects: b.projects.map((p) => normalizeProject(p as Record<string, unknown>)),
      ...(b.contractor ? { contractor: b.contractor as unknown as Contractor } : {}),
      ...(b.preferences ? { preferences: b.preferences as unknown as Preferences } : {}),
      ...(b.quoteDefaults ? { quoteDefaults: b.quoteDefaults as unknown as QuoteDefaults } : {}),
    },
  };
}

export interface ImportPlan {
  /** Jobs not on this device: added as they are. */
  added: Project[];
  /** Same job id already here with different content: added as a separate copy, never overwriting. */
  copies: Project[];
  /** Same job id and same last-edit time: already here, skipped. */
  skipped: Project[];
}

/** Never replaces an existing job. */
export function planImport(
  existing: Project[],
  incoming: Project[],
  newId: () => string,
): ImportPlan {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const plan: ImportPlan = { added: [], copies: [], skipped: [] };
  const seen = new Set<string>();
  for (const p of incoming) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const here = byId.get(p.id);
    if (!here) plan.added.push(p);
    else if (here.updatedAt === p.updatedAt) plan.skipped.push(p);
    else
      plan.copies.push({
        ...p,
        id: newId(),
        name: `${p.name} (restored)`,
        // Sharper analysis copies belong to the original job.
        photoIds: [],
      });
  }
  return plan;
}
