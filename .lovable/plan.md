# Automotive estimating for JobPix (staged)

## 1. What exists today (checked in the code)

- **Job record** (`src/lib/types.ts` `Project`): name, client, address, quote/invoice type, photos plus photoIds, scope, tasks, materials (name/qty/price, with an `ai` flag meaning "untouched AI suggestion"), labour hours/rate, `taxPercent`, notes, jobNotes, lastDraftNotes, scopeFromAi, supplier, payment terms, validity and deposit. Saved on the device under `cq.projects.v1`.
- **Totals** (`totals()`): materials + labour, then one combined "Tax / markup %". There is **no separate markup** and **no shop supplies/other costs line** today.
- **Suppliers** (`src/lib/settings.ts`): a fixed list of Home Hardware Building Centre / RONA / Home Depot. The default supplier lives in preferences. Jobs keep their supplier, and older jobs use the current default.
- **AI** (`src/lib/scope.functions.ts` `draftScope`): one gateway call that sends up to 6 photos plus a hint. The prompt explicitly says **"never automotive or small-engine repair"**. `mergeDraft` (`src/lib/draft-merge.ts`, tested) replaces untouched AI lines and keeps contractor-owned lines exactly as they are.
- **Screens**: `src/routes/index.tsx` (job list, New job dialog), `src/routes/project.$id.tsx` (job editor), `src/routes/document.$id.tsx` (printable quote/invoice), `src/routes/settings.tsx`.

## 2. Smallest viable first release (Stage 1)

A job gets a **kind**: Contractor (the default) or Automotive. You pick it in the New job dialog. Nothing changes for contractor jobs or their saved data.

**Stage 1 covers cars and light trucks only.** The AI prompt, labels and vehicle fields are written for road vehicles.

An automotive job reuses the same job page and adds or changes these parts:
1. **Vehicle card**: year, make, model, engine/trim, an optional VIN/plate/unit number, and an optional odometer reading.
2. **Optional Repair reference URL**: a plain link field you can paste any manual or procedure link into. It is saved with the job and opens in a new tab. The link is generic: it does not depend on any particular manual site, partnership or integration. JobPix never copies, scrapes or stores the manual itself, and everything works with the field left empty.
3. **Customer concern / technician notes**: the existing contractor notes field with an automotive label.
4. **AI findings (assistance only)**: one "Draft findings from photos" action. It gives a short list of findings, each marked Observed / Likely / Unknown with low/med/high confidence, and each tagged "Needs confirmation". It also suggests repairs and parts lines.
5. **Confirmation before quoting**: each finding has Confirm / Edit / Remove. Suggested parts and repairs come in as **Proposed** (an "AI – not confirmed" badge) and only count as confirmed once you tap Confirm or edit them. **Unconfirmed suggestions are left out of the quote document and out of all totals.** While any are left, the job page and the document both show a clear warning, e.g. "2 AI suggestions not confirmed — not included in this estimate."
6. **Estimate**: parts (name, part # optional, qty, price), **one total labour-hours figure × one hourly rate per job**, **Shop supplies / other** (one editable amount), a separate **Parts markup %**, a separate **Tax %**, and totals. Every price is editable, the AI never sets a final price, and suggested prices start at 0.
   - Totals order: confirmed parts → plus parts markup % (applied to parts only) → plus labour → plus shop supplies → subtotal → plus tax % → total.
   - Contractor jobs keep their existing single "Tax / markup %" field and their totals exactly as they are today.
7. **Parts supplier (separate from contractor suppliers)**: PartSource, Canadian Tire, or a custom name you type. For PartSource and Canadian Tire, "Check price" opens that store's search page. A custom supplier has no link. It is labelled "Based on {supplier} pricing — not live stock or pricing."
8. **Document**: for automotive jobs, a vehicle block (year/make/model/engine, VIN) and a Parts table appear. The Repair reference URL and AI confidence are not printed. Contractor documents stay exactly as they are.

**Deliberately not in Stage 1:**
- Small-engine and equipment work (mowers, ATVs, generators and similar)
- Guided task walkthroughs
- Any manual-site branding, partnership or integration
- Catalog/stock APIs, VIN decoding, or scraping/hosting manuals
- Automatic pricing or sending

**Later stages:**
- Stage 2: a default automotive supplier and labour rate in Settings, and a reusable list of vehicles.
- Stage 3: an optional walkthrough setting, off by default.
- Stage 4: small-engine/equipment support, once the car and light-truck workflow has been tested and validated.

## 3. Backward compatibility and storage

- Every new field is optional. If a job has no `kind`, it is treated as `"contractor"`, so every existing job loads and behaves the same. No data migration step is run, nothing is rewritten on load, and the same storage keys are used.
- Automotive data lives in one optional `vehicle` object plus an optional `autoSupplier`, `shopSupplies` and `findings` on the job. The contractor `supplier` field and preference are never read or changed for automotive jobs.
- Duplicate copies the vehicle data. Quote→invoice conversion works the same way.
- Ownership rules are unchanged. Findings and parts reuse the `ai` flag, so any edit makes the line contractor-owned, and a redraft replaces only untouched AI lines. A failed draft leaves everything as it was.

## 4. Risks and test plan

**Risks**
- The current AI prompt forbids automotive work, so automotive needs its own separate prompt and function. The contractor prompt stays untouched.
- AI diagnosis from photos is unreliable. This is handled by the Observed/Likely/Unknown labels, confidence levels, required confirmation, and an on-screen disclaimer.
- Photos plus the extra vehicle data increase the localStorage size. The existing 8-photo limit and compression are kept.
- The job page file is already large. Automotive parts will go in their own components to keep the risk low.

**Tests (Bun, next to `draft-merge.test.ts`)**
- A job with no `kind` totals exactly the same as before.
- Automotive totals: with parts $100, markup 20%, labour 2 h × $120, shop supplies $15 and tax 13%, the result is subtotal $375 and total $423.75.
- Markup applies to parts only, never to labour or shop supplies.
- Unconfirmed AI parts are excluded from the totals and from the document lines. Confirming or editing a part includes it.
- A redraft keeps confirmed and edited findings and parts exactly, and replaces only untouched AI lines.
- The automotive supplier choice never changes the contractor default.

**Preview checks**
- An existing contractor job is unchanged, including its document.
- A new automotive job: vehicle details persist after reload. The Repair reference URL is optional: the job works with it empty, and when it is filled in the link opens. AI findings show their labels.
- The confirm flow works. The unconfirmed warning appears on the job page and the document. The document shows the vehicle block, the markup and the tax lines. The custom supplier is saved.

## 5. Decisions (settled)

- Scope: cars and light trucks only. Small engines and equipment come in a later stage.
- Markup: a separate parts markup % and a separate tax % for automotive jobs.
- Unconfirmed AI suggestions: left out of documents and totals, with a clear warning.
- Labour: one total labour-hours figure and one hourly rate per job.

No open decisions remain. Implementation starts only once you approve this plan.

## Technical details

- `types.ts`:
  - New optional fields: `kind?: "contractor" | "automotive"`, `vehicle?: { year, make, model, engine, vin?, odometer?, referenceUrl? }`, `autoSupplier?: { key: "partsource" | "canadiantire" | "custom"; customName? }`, `shopSupplies?: number`, `partsMarkupPercent?: number`, `findings?: Finding[]`.
  - `Material` gets an optional `partNumber`. Proposed AI lines reuse `ai: true`; Confirm clears it.
  - `totals()` is unchanged for contractor jobs. A new `autoTotals()` counts only non-`ai` parts and applies markup to parts only.
  - Labour reuses the existing `laborHours` and `laborRate` fields.
- `settings.ts`: a separate `AUTO_SUPPLIERS` map. `SUPPLIERS` and the contractor default are left untouched.
- New `src/lib/auto.functions.ts` `draftAutoFindings`, a server function with its own cars/light-trucks prompt that includes the vehicle details and notes. It returns findings and proposed parts/repairs with status and confidence, and runs on the existing gateway path and model. The contractor `draftScope` is unchanged.
- New `src/lib/auto-merge.ts` plus tests, which reuse the `mergeDraft` ownership rules. New `autoTotals` tests go alongside them.
- New components `VehicleCard` and `FindingsList`. `project.$id.tsx` branches on `kind`, `document.$id.tsx` adds a vehicle block, markup line and warning, and `index.tsx` gets a kind picker in the New job dialog.
- The repair reference URL is checked to be http(s) and rendered with `rel="noopener noreferrer"`.
- Record in AGENTS.md: "Job kind gates automotive UI and totals; missing kind = contractor."
