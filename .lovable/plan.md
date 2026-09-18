# Two-model photo analysis for JobPix

Turn job photos into a structured, reviewable analysis — with a second AI opinion available on demand — while keeping the contractor in control of every number that reaches a customer.

## What exists today (verified)

- Single-user app, everything saved on the device (jobs, business profile, quote defaults, preferences). No accounts, no server database.
- Photo flow: camera or upload, shrunk to about 1024px and stored with the job. Up to 8 photos per job.
- One AI step today: "Draft scope from photos" sends up to 4 photos to a server-side function and returns a description, task list and materials, which are appended to the job and fully editable.
- The quote/invoice page prints business profile, logo, scope, materials, labour, totals, terms and signature lines.
- No API keys live in the app; the AI call already happens on the server.

## Decisions you made

- Use JobPix's built-in AI — both an OpenAI model and a Google model are reachable through it, so there are no keys to create, paste or protect.
- One model runs first; a "Second opinion" button runs the other model and compares.
- Keep a sharper copy of each photo purely for analysis, so small damage, labels and fixtures read better.

## What you'll get

**On the job page, a new Analysis panel added alongside the existing photo tools:**

1. **Analyse photos** — runs the first model and produces a structured report, not just a paragraph:
   job type, what's visible (structures, surfaces, equipment), work required, preparation required,
   materials, measurements, quantities, labour considerations, safety and access notes, unknowns,
   questions to confirm with the customer, and an overall confidence level.
2. Every line is tagged **Observed**, **Estimated** or **Unknown**. Tapping a line marks it
   **Confirmed by you**.
3. **Second opinion** — runs the other model on the same photos and shows a side-by-side comparison:
   where the two agree (higher confidence), where they differ (flagged for your judgment), and
   anything only one model spotted.
4. **Use in this quote** — you choose which findings, tasks and materials get pushed into the
   existing scope, task and material lists. Nothing is pushed automatically, and existing lines are
   never overwritten.
5. Questions to confirm appear as a short checklist you can work through on site.

**On the customer document:** unchanged. The analysis is an internal working document; only what you push into the scope, tasks, materials and pricing appears on a quote or invoice. No quote is ever sent automatically.

**In Settings:** a small "Photo analysis" group — which model runs first, and whether to keep the sharper photo copies (with a note on storage use).

## Your refinements, folded in

**All photos, never silently dropped.** Analysis uses every photo on the job, up to the existing
8-photo limit. Before you run it, the panel states the count plainly — "6 photos ready for analysis
— all 6 will be analysed." If a model can't accept that many in one request, it names exactly which
photos are included and which are not, before you start — no silent trimming. Afterwards a one-line
summary shows photos analysed and findings by status (Observed / Estimated / Unknown / Confirmed by
you).

**Comparison is arithmetic, not a third AI call.** `compareAnalyses()` is a pure function in plain
code: it normalises each item (lowercase, trimmed, singular/plural and unit-string smoothing),
matches items between the two reports by that normalised key with a similarity threshold, and sorts
each match into Agreed / Differs / Only-one-model. Numbers (quantities, measurements, hours) compare
by value with a tolerance band, so "4 sheets" and "4 sheet" agree while "4" and "9" differ. Same
input always gives the same output, and no AI credits are spent on comparing.

**Your confirmations win, permanently.** Every item carries a stable id. Once you mark it
**Confirmed by you**, re-analysis and second opinions can never overwrite, downgrade or delete it —
the merge step treats confirmed items as locked and writes new AI findings alongside them, labelled
"AI suggests" so you can see the difference and choose. Deleting a confirmed item is only ever your
action.

**draftScope stays exactly as it is.** The existing "Draft scope from photos" button and its server
function keep working, untouched, as the fallback path. The Analysis panel is added next to it, not
in place of it.

## Storage: sharper photos go to IndexedDB

Evaluated as you asked. Recommendation: keep jobs, text and the existing 1024px display photos in
localStorage exactly as today, and put only the sharper ~1600px analysis copies in IndexedDB.

Why: localStorage is a hard ~5 MB shared budget, it stores text so image bytes cost about 33% extra
as base64, and — critically — a single write that exceeds the quota throws and can leave the whole
jobs list unsaved. IndexedDB has a far larger budget (typically hundreds of MB), stores image blobs
natively without the base64 penalty, and lives in its own store, so an analysis-photo write failing
can never touch your jobs.

Safety rules, non-negotiable:

- The jobs list is written first and independently. Analysis photos are written afterwards in a
  separate transaction. A failed analysis-photo write is caught, reported as a gentle notice, and
  leaves the job and its normal photos completely intact.
- If IndexedDB is unavailable or full, analysis simply uses the existing display photos. The feature
  degrades; nothing breaks and nothing is lost.
- Deleting a photo or a job removes its analysis copies too, so the store never grows orphaned data.

This is a small addition (one keyed object store, one thin helper module), not a storage rewrite.

## Also fixing (the two you approved)

- Money amounts briefly showing the wrong currency on first load.
- The support contact link briefly rendering with the wrong address on first load.

Both are first-render timing issues: the saved preference is read after the first paint. Fix is to
read those values through the same hydration-safe path the rest of the app uses. Nothing else in
those files changes.

## Deliberately not built

No autonomous agents, no automatic pricing, no automatic sending, no AI personality or prompt controls, no server database, no redesign of the existing photo flow or UI, no MCP, no third AI call for comparison.

## Final list of files and functions

**Modified**

- `src/routes/project.$id.tsx` — mounts the Analysis panel; keeps the existing photo grid, camera/upload buttons and the draftScope button as-is.
- `src/lib/types.ts` — `Project` gains optional `analysis`; hydration-safe currency in `money()`.
- `src/lib/storage.ts` — write analysis photos alongside (not inside) the job write; prune them on photo/job delete.
- `src/lib/settings.ts` — adds `analysisModel` and `keepSharpPhotos` preferences with defaults.
- `src/routes/settings.tsx` — the "Photo analysis" group; hydration-safe support link.
- `src/lib/scope.functions.ts` — untouched apart from staying importable; `draftScope` unchanged.

**New**

- `src/lib/analysis.ts` — shared types (`AnalysisItem` with `status: observed | estimated | unknown | confirmed`, `AnalysisReport`, `AnalysisComparison`), `compareAnalyses()` (pure, deterministic), `mergeAnalysis()` (confirmed-wins), `pushToQuote()` helpers.
- `src/lib/analysis.functions.ts` — `analyzePhotos({ photos, model, hint, units })` server function only; reads `LOVABLE_API_KEY` inside the handler, validates the model reply against a strict schema with zod, and returns a clear error rather than a half-built report.
- `src/lib/analysis-photos.ts` — the IndexedDB helper (put / get / delete sharper copies), with graceful fallback.
- `src/components/AnalysisPanel.tsx` — run buttons, photo count notice, the report with status chips and confirm actions, questions checklist, "Use in this quote".
- `src/components/AnalysisComparison.tsx` — Agreed / Differs / Only-one-model view.

## Risks

- **Cost and time:** a full structured analysis over up to 8 photos is a bigger request than today's draft; the second opinion doubles it. Both are explicit button presses, and long runs stream so you see progress rather than a dead spinner.
- **Measurements from photos are guesses.** They stay Estimated until you confirm them, and the panel says so plainly.
- **Device storage** grows with the sharper copies; the Settings switch turns them off, and the safety rules above mean a full device never costs you a job.
