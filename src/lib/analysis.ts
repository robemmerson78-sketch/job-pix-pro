/**
 * Shared types and deterministic (non-AI) logic for the two-model photo analysis.
 * Nothing in this file makes a network call.
 */

export type ModelKey = "openai" | "google";

export const MODEL_LABELS: Record<ModelKey, string> = {
  openai: "OpenAI vision",
  google: "Google vision",
};

/** How many photos each model can take in one analysis request. */
export const MODEL_PHOTO_LIMITS: Record<ModelKey, number> = {
  openai: 8,
  google: 8,
};

export const otherModel = (m: ModelKey): ModelKey => (m === "openai" ? "google" : "openai");

export type FindingStatus = "observed" | "estimated" | "unknown" | "confirmed";

export type FindingCategory =
  | "jobType"
  | "visible"
  | "work"
  | "prep"
  | "material"
  | "measurement"
  | "labour"
  | "safety"
  | "unknown"
  | "question";

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  jobType: "Job type",
  visible: "What's visible",
  work: "Work required",
  prep: "Preparation required",
  material: "Materials",
  measurement: "Measurements",
  labour: "Labour considerations",
  safety: "Safety & access",
  unknown: "Unknowns",
  question: "Confirm with the customer",
};

export const CATEGORY_ORDER: FindingCategory[] = [
  "jobType",
  "visible",
  "work",
  "prep",
  "material",
  "measurement",
  "labour",
  "safety",
  "unknown",
  "question",
];

export const STATUS_LABELS: Record<FindingStatus, string> = {
  observed: "Observed",
  estimated: "Estimated",
  unknown: "Unknown",
  confirmed: "Confirmed by you",
};

export interface AnalysisItem {
  id: string;
  category: FindingCategory;
  text: string;
  qty: number | null;
  unit: string | null;
  status: FindingStatus;
  /** Which model produced it, or the contractor if they confirmed/edited it. */
  source: ModelKey | "contractor";
  /** Set when this is an AI suggestion that conflicts with a confirmed item. */
  suggestionFor?: string;
}

export interface AnalysisReport {
  model: ModelKey;
  jobType: string;
  confidence: "low" | "medium" | "high";
  photoCount: number;
  createdAt: number;
  items: AnalysisItem[];
}

export interface ProjectAnalysis {
  /** Latest report per model, kept for the side-by-side comparison. */
  reports: Partial<Record<ModelKey, AnalysisReport>>;
  /** The working set the contractor reviews and confirms. */
  items: AnalysisItem[];
}

/** Raw, validated model output before ids are attached. */
export interface RawAnalysis {
  jobType: string;
  confidence: "low" | "medium" | "high";
  items: Array<{
    category: FindingCategory;
    text: string;
    qty: number | null;
    unit: string | null;
    status: "observed" | "estimated" | "unknown";
  }>;
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function toReport(raw: RawAnalysis, model: ModelKey, photoCount: number): AnalysisReport {
  return {
    model,
    jobType: raw.jobType,
    confidence: raw.confidence,
    photoCount,
    createdAt: Date.now(),
    items: raw.items.map((i) => ({
      id: newId(),
      category: i.category,
      text: i.text,
      qty: i.qty ?? null,
      unit: i.unit ?? null,
      status: i.status,
      source: model,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Normalisation + matching (pure, deterministic)
 * ------------------------------------------------------------------ */

const singular = (word: string) =>
  word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "for", "with", "on", "in", "is"]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .map(singular)
    .filter((w) => w && !STOP.has(w))
    .join(" ")
    .trim();
}

const tokens = (text: string) => new Set(normalizeText(text).split(" ").filter(Boolean));

/** Jaccard overlap of the two token sets — same input always gives the same number. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1;
  });
  return shared / (ta.size + tb.size - shared);
}

const MATCH_THRESHOLD = 0.55;
const NUMBER_TOLERANCE = 0.1;

function numbersAgree(a: AnalysisItem, b: AnalysisItem): boolean {
  if (a.qty == null && b.qty == null) return true;
  if (a.qty == null || b.qty == null) return false;
  const span = Math.max(Math.abs(a.qty), Math.abs(b.qty), 1);
  if (Math.abs(a.qty - b.qty) / span > NUMBER_TOLERANCE) return false;
  const ua = normalizeText(a.unit ?? "");
  const ub = normalizeText(b.unit ?? "");
  return !ua || !ub || ua === ub;
}

export interface ComparisonPair {
  a: AnalysisItem;
  b: AnalysisItem;
  score: number;
}

export interface AnalysisComparisonResult {
  agreed: ComparisonPair[];
  differs: ComparisonPair[];
  onlyA: AnalysisItem[];
  onlyB: AnalysisItem[];
}

/**
 * Deterministic, local comparison of two reports. No AI call, no credits.
 * Greedy best-match within the same category, highest similarity first.
 */
export function compareAnalyses(
  reportA: AnalysisReport,
  reportB: AnalysisReport,
): AnalysisComparisonResult {
  const candidates: ComparisonPair[] = [];

  for (const a of reportA.items) {
    for (const b of reportB.items) {
      if (a.category !== b.category) continue;
      const score = similarity(a.text, b.text);
      if (score >= MATCH_THRESHOLD) candidates.push({ a, b, score });
    }
  }

  // Stable ordering so the same inputs always produce the same output.
  candidates.sort(
    (x, y) =>
      y.score - x.score ||
      x.a.text.localeCompare(y.a.text) ||
      x.b.text.localeCompare(y.b.text),
  );

  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const agreed: ComparisonPair[] = [];
  const differs: ComparisonPair[] = [];

  for (const pair of candidates) {
    if (usedA.has(pair.a.id) || usedB.has(pair.b.id)) continue;
    usedA.add(pair.a.id);
    usedB.add(pair.b.id);
    if (numbersAgree(pair.a, pair.b)) agreed.push(pair);
    else differs.push(pair);
  }

  return {
    agreed,
    differs,
    onlyA: reportA.items.filter((i) => !usedA.has(i.id)),
    onlyB: reportB.items.filter((i) => !usedB.has(i.id)),
  };
}

/* ------------------------------------------------------------------ *
 * Merging — contractor confirmations are authoritative
 * ------------------------------------------------------------------ */

/**
 * Folds a fresh report into the working set.
 * Confirmed items are never overwritten, downgraded or removed; a new AI finding
 * that clashes with one is kept separately as a suggestion.
 */
export function mergeAnalysis(existing: AnalysisItem[], report: AnalysisReport): AnalysisItem[] {
  const confirmed = existing.filter((i) => i.status === "confirmed");
  // Drop previous unconfirmed findings from this same model, and any stale
  // suggestions it left behind; keep other models' findings as they were.
  const kept = existing.filter((i) => i.status !== "confirmed" && i.source !== report.model);

  const incoming: AnalysisItem[] = report.items.map((item) => {
    const clash = confirmed.find(
      (c) => c.category === item.category && similarity(c.text, item.text) >= MATCH_THRESHOLD,
    );
    return clash ? { ...item, suggestionFor: clash.id } : item;
  });

  return [...confirmed, ...kept, ...incoming];
}

export function statusCounts(items: AnalysisItem[]): Record<FindingStatus, number> {
  const counts: Record<FindingStatus, number> = {
    observed: 0,
    estimated: 0,
    unknown: 0,
    confirmed: 0,
  };
  for (const i of items) counts[i.status] += 1;
  return counts;
}

export function groupByCategory(items: AnalysisItem[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category && !i.suggestionFor),
  })).filter((g) => g.items.length > 0);
}

/** Text used when a finding is pushed into the quote's task or material list. */
export function itemToLine(item: AnalysisItem): string {
  const qty = item.qty != null ? ` — ${item.qty}${item.unit ? ` ${item.unit}` : ""}` : "";
  return `${item.text}${qty}`;
}
