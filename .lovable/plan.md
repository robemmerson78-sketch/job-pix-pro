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

**On the job page, replacing the single draft button with an Analysis panel:**

1. **Analyse photos** — runs the first model and produces a structured report, not just a paragraph:
   job type, what's visible (structures, surfaces, equipment), work required, preparation required,
   materials, measurements, quantities, labour considerations, safety and access notes, unknowns,
   questions to confirm with the customer, and an overall confidence level.
2. Every line is tagged **Observed**, **Estimated** or **Unknown**. Tapping a line marks it
   **Confirmed by you**, which locks it as fact and removes it from the questions list.
3. **Second opinion** — runs the other model on the same photos and shows a side-by-side comparison:
   where the two agree (higher confidence), where they differ (flagged for your judgment), and
   anything only one model spotted.
4. **Use in this quote** — you choose which findings, tasks and materials get pushed into the
   existing scope, task and material lists. Nothing is pushed automatically, and existing lines are
   never overwritten.
5. Questions to confirm appear as a short checklist you can work through on site.

**On the customer document:** unchanged by default. The analysis is an internal working document; only what you push into the scope, tasks, materials and pricing appears on a quote or invoice. No quote is ever sent automatically.

**In Settings:** a small "Photo analysis" group — which model runs first, and whether to keep the sharper photo copies (with a note on storage use).

## Deliberately not built

No autonomous agents, no automatic pricing, no automatic sending, no AI personality or prompt controls, no new database, no redesign of the existing photo flow, no MCP.

## Technical notes

- Storage: `Project` gains an optional `analysis` field holding one run per model (`observations`, `tasks`, `materials`, `measurements`, `questions`, `confidence`, each item carrying `status: observed | estimated | unknown | confirmed`), plus the comparison result. Older jobs without it keep working — the field is optional throughout.
- Sharper photos: a parallel `analysisPhotos` array stored at ~1600px alongside the existing 1024px display photos, written by the same `fileToCompressedDataUrl` helper with a different max. Jobs created before this change fall back to the display photos. Both arrays are pruned together when a photo is deleted. Because localStorage is capped, the app will warn and skip the sharper copy if the quota is hit rather than losing the job.
- Server: extend `src/lib/scope.functions.ts` (or a sibling `analysis.functions.ts`) with `analyzePhotos({ photos, model, hint, units })` and `compareAnalyses({ a, b })`, both `createServerFn`. `LOVABLE_API_KEY` is read inside the handler only; nothing about the AI reaches the client bundle. The Google model call uses the chat-completions gateway path; the OpenAI model call uses the gateway Responses API with streaming consumed server-side, since reasoning runs are slow.
- Output shape is enforced with a strict JSON schema and validated with zod, so a malformed reply surfaces a clear error instead of corrupting a job.
- The existing `draftScope` stays as the shortcut path so nothing currently working breaks; the new panel supersedes it in the UI.
- Files touched: `src/routes/project.$id.tsx` (analysis panel), `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/settings.ts`, `src/routes/settings.tsx`.
  New: `src/lib/analysis.functions.ts`, `src/lib/analysis.ts` (shared types/helpers), `src/components/AnalysisPanel.tsx`, `src/components/AnalysisComparison.tsx`.

## Risks

- **Cost and time:** a full structured analysis is a bigger request than today's draft; the second opinion doubles it. Both are explicit button presses.
- **Device storage:** sharper photos roughly double per-job image size. Handled with a quota guard and a Settings switch.
- **Measurements from photos are guesses.** They will always show as Estimated until you confirm them, and the panel says so plainly.

## Worth fixing while I'm in here

Two small existing glitches: money amounts briefly render in the wrong currency on first load, and the same for the support contact link. Small fixes, included unless you'd rather I leave them.
