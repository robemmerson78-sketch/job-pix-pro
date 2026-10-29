// @ts-nocheck -- run with `bun test`; bun:test types are not installed in this project.
import { describe, expect, test } from "bun:test";
import { draftIsStale, mergeDraft, type DraftResult } from "./draft-merge";
import type { Project } from "./types";

let n = 0;
const id = () => `id${++n}`;

const base = (): Project => ({
  id: "p",
  name: "Bath",
  client: "Ann",
  address: "1 Main",
  type: "quote",
  createdAt: 1,
  updatedAt: 1,
  photos: ["a", "b"],
  photoIds: ["1", "2"],
  scope: "",
  tasks: [],
  materials: [],
  laborHours: 5,
  laborRate: 80,
  taxPercent: 13,
  notes: "quote note",
  jobNotes: "replace vanity",
  supplier: "homehardware" as Project["supplier"],
});

const draftA: DraftResult = {
  description: "Replace vanity.",
  tasks: ["Remove old vanity", "Install new vanity"],
  materials: [
    { name: "Vanity 30in", qty: 1, price: 300 },
    { name: "Silicone caulk", qty: 2, price: 9 },
  ],
};
const draftB: DraftResult = {
  description: "Replace vanity and mirror.",
  tasks: ["Remove vanity", "Hang mirror"],
  materials: [
    { name: "30 in vanity cabinet", qty: 1, price: 320 },
    { name: "Wall mirror 24x36", qty: 1, price: 90 },
  ],
};

const apply = (p: Project, r: DraftResult, notes = p.jobNotes ?? "") => {
  const { keptScope, ...patch } = mergeDraft(p, r, notes, id);
  return { p: { ...p, ...patch }, keptScope };
};

describe("mergeDraft", () => {
  test("first draft sets scope and tags AI lines", () => {
    const { p } = apply(base(), draftA);
    expect(p.scope).toBe("Replace vanity.");
    expect(p.scopeFromAi).toBe(true);
    expect(p.tasks).toHaveLength(2);
    expect(p.materials.every((m) => m.ai)).toBe(true);
  });

  test("repeated drafts replace untouched AI lines instead of piling up", () => {
    let { p } = apply(base(), draftA);
    p = apply(p, draftB).p;
    p = apply(p, draftB).p;
    expect(p.materials.map((m) => m.name)).toEqual(["30 in vanity cabinet", "Wall mirror 24x36"]);
    expect(p.tasks).toHaveLength(2);
    expect(p.scope).toBe("Replace vanity and mirror.");
  });

  test("edited and manual materials survive exactly", () => {
    let { p } = apply(base(), draftA);
    p = {
      ...p,
      materials: [
        { ...p.materials[0], price: 275, ai: undefined },
        p.materials[1],
        { id: "m", name: "Shims", qty: 3, price: 4 },
      ],
    };
    p = apply(p, draftB).p;
    expect(p.materials[0]).toMatchObject({ name: "Vanity 30in", qty: 1, price: 275 });
    expect(p.materials[1]).toEqual({ id: "m", name: "Shims", qty: 3, price: 4 });
    expect(p.materials.some((m) => m.name === "Silicone caulk")).toBe(false);
  });

  test("edited and typed tasks survive", () => {
    let { p } = apply(base(), draftA);
    p = { ...p, tasks: [{ ...p.tasks[0], text: "Remove vanity carefully", ai: undefined }, p.tasks[1], { id: "t", text: "Haul away" }] };
    p = apply(p, draftB).p;
    expect(p.tasks.map((t) => t.text)).toEqual(["Remove vanity carefully", "Haul away", "Remove vanity", "Hang mirror"]);
  });

  test("edited scope is kept, AI scope is replaced", () => {
    let { p } = apply(base(), draftA);
    p = { ...p, scope: "My words", scopeFromAi: false };
    const r = apply(p, draftB);
    expect(r.p.scope).toBe("My words");
    expect(r.keptScope).toBe(true);
  });

  test("legacy job lines are kept", () => {
    const p = { ...base(), scope: "Old", materials: [{ id: "x", name: "Old item", qty: 1, price: 5 }] };
    const r = apply(p, draftA).p;
    expect(r.scope).toBe("Old");
    expect(r.materials[0]).toEqual({ id: "x", name: "Old item", qty: 1, price: 5 });
  });

  test("other job details are untouched", () => {
    const b = base();
    const { p } = apply(b, draftA);
    for (const k of ["photos", "photoIds", "laborHours", "laborRate", "taxPercent", "notes", "jobNotes", "supplier", "client", "address", "type"] as const)
      expect(p[k]).toEqual(b[k]);
  });

  test("changed notes mark the draft stale until redrafted", () => {
    let { p } = apply(base(), draftA);
    expect(draftIsStale(p)).toBe(false);
    p = { ...p, jobNotes: "replace vanity and mirror" };
    expect(draftIsStale(p)).toBe(true);
    expect(p.materials).toHaveLength(2);
    p = apply(p, draftB).p;
    expect(draftIsStale(p)).toBe(false);
  });
});

import { mergeClarifications } from "./draft-merge";
import { totals } from "./types";

describe("safer material redrafts", () => {
  test("paint/primer: edited paint kept, no duplicate, primer price not overwritten", () => {
    const first: DraftResult = {
      description: "Paint exterior.",
      tasks: ["Prep", "Paint"],
      materials: [
        { name: "Exterior paint", qty: 2, price: 60 },
        { name: "Primer", qty: 1, price: 25 },
      ],
    };
    let { p } = apply(base(), first);
    const paint = p.materials[0];
    const primer = p.materials[1];
    // Contractor already has paint: price edited to 0. Primer left untouched.
    p = { ...p, materials: [{ ...paint, price: 0, ai: undefined, pending: undefined }, primer] };
    const redraft: DraftResult = {
      description: "Paint exterior.",
      tasks: ["Prep", "Paint"],
      materials: [
        { name: "Exterior latex paint, 1 gal", qty: 2, price: 58 },
        { name: "Primer", qty: 1, price: 55 },
      ],
    };
    p = apply(p, redraft).p;
    const paints = p.materials.filter((m) => /paint/i.test(m.name));
    expect(paints).toHaveLength(1);
    expect(paints[0]).toMatchObject({ name: "Exterior paint", price: 0 });
    const pr = p.materials.find((m) => m.name === "Primer")!;
    expect(pr.price).toBe(25);
    expect(pr.aiSuggestedPrice).toBe(55);
    expect(p.pendingDuplicates?.map((d) => d.name)).toEqual(["Exterior latex paint, 1 gal"]);
  });

  test("a matchId to a contractor line never changes it", () => {
    let p: Project = { ...base(), materials: [{ id: "own", name: "Primer", qty: 1, price: 25 }] };
    p = apply(p, { description: "", tasks: [], materials: [{ name: "Primer quart", qty: 3, price: 55, matchId: "own" }] }).p;
    expect(p.materials).toEqual([{ id: "own", name: "Primer", qty: 1, price: 25 }]);
  });

  test("excluded line stays excluded, costs $0 and is not re-added", () => {
    let p: Project = { ...base(), laborHours: 0, taxPercent: 0, materials: [{ id: "x", name: "Exterior paint", qty: 2, price: 60, excluded: true }] };
    expect(totals(p).materials).toBe(0);
    p = apply(p, { description: "", tasks: [], materials: [{ name: "Exterior paint", qty: 2, price: 60 }] }).p;
    expect(p.materials).toEqual([{ id: "x", name: "Exterior paint", qty: 2, price: 60, excluded: true }]);
  });

  test("new unconfirmed suggestions are left out of totals until confirmed", () => {
    let { p } = apply({ ...base(), laborHours: 0, taxPercent: 0 }, draftA);
    expect(totals(p).materials).toBe(0);
    p = { ...p, materials: p.materials.map((m) => ({ ...m, ai: undefined, pending: undefined })) };
    expect(totals(p).materials).toBe(318);
  });

  test("older AI-tagged lines (no pending tag) still count in totals", () => {
    const p: Project = { ...base(), laborHours: 0, taxPercent: 0, materials: [{ id: "o", name: "Old AI caulk", qty: 2, price: 9, ai: true }] };
    expect(totals(p).total).toBe(18);
  });

  test("repeated identical redrafts do not grow the list", () => {
    let { p } = apply(base(), draftA);
    for (let i = 0; i < 3; i++) p = apply(p, draftA).p;
    expect(p.materials).toHaveLength(2);
  });
});

describe("mergeClarifications", () => {
  const ids = () => `q${++n}`;
  test("answered questions are not re-asked while inputs are unchanged", () => {
    const prev = [{ id: "a", question: "Do you already have paint?", answer: "Yes", status: "answered" as const, askedFor: "fp1" }];
    const next = mergeClarifications(prev, ["Do you already have paint?", "Wall height?"], "fp1", ids);
    expect(next.map((c) => c.question)).toEqual(["Do you already have paint?", "Wall height?"]);
    expect(next[0]).toEqual(prev[0]);
  });
  test("a question can be re-asked after the job changed", () => {
    const prev = [{ id: "a", question: "Do you already have paint?", answer: "Yes", status: "answered" as const, askedFor: "fp1" }];
    const next = mergeClarifications(prev, ["Do you already have paint?"], "fp2", ids);
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe("open");
  });
});
