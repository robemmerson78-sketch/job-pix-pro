/* eslint-disable @typescript-eslint/ban-ts-comment -- bun:test types are not installed */
// @ts-nocheck -- run with `bun test`; bun:test types are not installed in this project.
import { describe, expect, test } from "bun:test";
import { AI_LIMITS, AiLimitError, checkPhotos, checkText, createLimiter } from "./ai-guard";
import { safeWrite, unreferencedPhotoIds } from "./storage-core";
import { BACKUP_FORMAT, parseBackup, planImport } from "./backup-core";

const photo = (n = 100) => "data:image/jpeg;base64," + "A".repeat(n);

describe("AI request caps", () => {
  test("accepts up to 4 normal photos", () => {
    expect(() => checkPhotos([photo(), photo(), photo(), photo()])).not.toThrow();
  });
  test("refuses a 5th photo", () => {
    expect(() => checkPhotos([photo(), photo(), photo(), photo(), photo()])).toThrow(AiLimitError);
  });
  test("refuses an oversized photo", () => {
    expect(() => checkPhotos([photo(AI_LIMITS.maxPhotoChars + 1)])).toThrow(/too large/);
  });
  test("refuses non-image data", () => {
    expect(() => checkPhotos(["https://example.com/x.jpg"])).toThrow(/supported image/);
    expect(() => checkPhotos(["data:text/html;base64,AAAA"])).toThrow(AiLimitError);
  });
  test("refuses very long text", () => {
    expect(() => checkText("x".repeat(AI_LIMITS.maxTextChars * 3 + 1))).toThrow(/too long/);
  });
  test("per-client limit: 6 per minute, then blocked, then allowed after a minute", () => {
    let t = 0;
    const l = createLimiter(() => t);
    for (let i = 0; i < 6; i++) l.take("a");
    expect(() => l.take("a")).toThrow(/wait a minute/);
    expect(() => l.take("b")).not.toThrow();
    t = 61_000;
    expect(() => l.take("a")).not.toThrow();
  });
  test("per-client daily limit of 80", () => {
    let t = 0;
    const l = createLimiter(() => t);
    for (let i = 0; i < 80; i++) {
      t += 11_000; // stay under the per-minute limit
      l.take("a");
    }
    t += 11_000;
    expect(() => l.take("a")).toThrow(/today/);
  });
  test("global limit of 60 per minute across clients", () => {
    const l = createLimiter(() => 0);
    for (let i = 0; i < 60; i++) l.take(`c${i}`);
    expect(() => l.take("new")).toThrow(/busy/);
  });
});

describe("storage safety", () => {
  test("a full device is reported, not thrown, and the old value stays", () => {
    const store = {
      v: "old",
      setItem() {
        const e = new Error("full");
        e.name = "QuotaExceededError";
        throw e;
      },
    };
    expect(safeWrite(store, "k", "new")).toEqual({ ok: false, reason: "full" });
    expect(store.v).toBe("old");
  });
  test("a normal save succeeds", () => {
    const m = {};
    expect(safeWrite({ setItem: (k, v) => (m[k] = v) }, "k", "v")).toEqual({ ok: true });
    expect(m.k).toBe("v");
  });
  test("a photo still used by a duplicated job is not deleted", () => {
    const jobs = [{ photos: ["idb:p1", "data:image/jpeg;base64,AA"] }];
    expect(unreferencedPhotoIds(["p1", "p2"], jobs)).toEqual(["p2"]);
  });
});

describe("backup restore", () => {
  const job = (id, updatedAt = 1) => ({
    id,
    name: `Job ${id}`,
    updatedAt,
    photos: [photo()],
    tasks: [],
    materials: [{ id: "m", name: "Primer", qty: 1, price: 25 }],
  });
  const file = (o) =>
    JSON.stringify({ format: BACKUP_FORMAT, version: 1, projects: [job("a")], ...o });

  test("rejects non-JobPix files and damaged backups", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false);
    expect(parseBackup(file({ projects: [{ name: "no id" }] })).ok).toBe(false);
  });
  test("rejects backups from a newer version", () => {
    const r = parseBackup(file({ version: 99 }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/newer version/);
  });
  test("fills missing fields so a sparse backup loads like a normal job", () => {
    const r = parseBackup(file({}));
    expect(r.ok).toBe(true);
    const p = r.backup.projects[0];
    expect(p.type).toBe("quote");
    expect(p.laborHours).toBe(0);
    expect(p.materials[0].price).toBe(25);
  });
  test("drops anything in photos that isn't image data", () => {
    const r = parseBackup(
      file({ projects: [{ ...job("a"), photos: [photo(), "javascript:alert(1)", "idb:x"] }] }),
    );
    expect(r.backup.projects[0].photos).toHaveLength(1);
  });
  test("never overwrites: new added, changed added as copy, identical skipped", () => {
    let n = 0;
    const existing = [job("a", 1), job("b", 1)];
    const plan = planImport(existing, [job("a", 1), job("b", 2), job("c", 1)], () => `new${++n}`);
    expect(plan.added.map((p) => p.id)).toEqual(["c"]);
    expect(plan.skipped.map((p) => p.id)).toEqual(["a"]);
    expect(plan.copies).toHaveLength(1);
    expect(plan.copies[0].id).toBe("new1");
    expect(plan.copies[0].name).toBe("Job b (restored)");
  });
});
