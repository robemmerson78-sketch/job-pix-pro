/**
 * Server-side caps for the public AI functions.
 *
 * JobPix has no accounts or database, so there is no reliable shared identity or shared counter.
 * What this gives, in order of strength:
 * 1. Hard request-size caps (always enforced): photo count, photo format and size, text lengths.
 * 2. Same-site check: browsers send Sec-Fetch-Site; cross-site browser calls are refused.
 *    Scripts can fake headers, so this only stops casual cross-site abuse.
 * 3. Best-effort rate limits held in server memory. Each server instance keeps its own counters
 *    and they reset when it restarts, so they slow abuse down but are NOT a guaranteed cap.
 */

export const AI_LIMITS = {
  maxPhotos: 4,
  /** Display photos are ~1024px JPEG at 0.6 quality: usually 60–250 KB of base64 text. */
  maxPhotoChars: 700_000,
  maxTotalPhotoChars: 2_400_000,
  maxTextChars: 8_000,
  perClientPerMinute: 6,
  perClientPerDay: 80,
  globalPerMinute: 60,
} as const;

export class AiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiLimitError";
  }
}

const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function checkPhotos(photos: string[]) {
  if (photos.length > AI_LIMITS.maxPhotos)
    throw new AiLimitError(`The AI reads up to ${AI_LIMITS.maxPhotos} photos at a time.`);
  let total = 0;
  for (const p of photos) {
    if (p.length > AI_LIMITS.maxPhotoChars)
      throw new AiLimitError(
        "One of the photos is too large for the AI. Remove it and add it again.",
      );
    if (!PHOTO_RE.test(p))
      throw new AiLimitError(
        "One of the photos isn't a supported image. Remove it and add it again.",
      );
    total += p.length;
  }
  if (total > AI_LIMITS.maxTotalPhotoChars)
    throw new AiLimitError(
      "These photos are too large to send together. Remove one and try again.",
    );
}

export function checkText(...texts: Array<string | undefined>) {
  const total = texts.reduce((n, t) => n + (t?.length ?? 0), 0);
  if (total > AI_LIMITS.maxTextChars * 3)
    throw new AiLimitError(
      "Your notes and job details are too long for the AI. Shorten them and try again.",
    );
}

/** Sliding-window counters. Pure and in-memory so it can be tested. */
export function createLimiter(now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const count = (key: string, windowMs: number) => {
    const t = now();
    const list = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    hits.set(key, list);
    return list.length;
  };
  return {
    /** Throws AiLimitError when over a limit; otherwise records the hit. */
    take(clientKey: string) {
      if (count("*", 60_000) >= AI_LIMITS.globalPerMinute)
        throw new AiLimitError("JobPix AI is busy right now. Please try again in a minute.");
      if (count(`m:${clientKey}`, 60_000) >= AI_LIMITS.perClientPerMinute)
        throw new AiLimitError(
          "Too many AI requests in a short time. Please wait a minute and try again.",
        );
      if (count(`d:${clientKey}`, 86_400_000) >= AI_LIMITS.perClientPerDay)
        throw new AiLimitError(
          "You've reached today's AI limit on this connection. Please try again tomorrow.",
        );
      const t = now();
      for (const k of ["*", `m:${clientKey}`, `d:${clientKey}`]) hits.get(k)!.push(t);
      if (hits.size > 5000) hits.clear(); // bound memory
    },
  };
}

const limiter = createLimiter();

/** Runs every check; call at the top of each AI handler. */
export async function guardAiRequest(photos: string[], ...texts: Array<string | undefined>) {
  checkPhotos(photos);
  checkText(...texts);
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const site = getRequestHeader("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new AiLimitError("AI requests are only accepted from the JobPix app.");
  // Best-effort client key; not a reliable identity (shared networks share it, it can change).
  const key =
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  limiter.take(key);
}
