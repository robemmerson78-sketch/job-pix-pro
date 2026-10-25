# Automotive estimating for JobPix (staged)

## 1. What exists today (checked in the code)

- **Job record** (`src/lib/types.ts` `Project`): name, client, address, quote/invoice type, photos plus photoIds, scope, tasks, materials (name/qty/price, with an `ai` flag meaning "untouched AI suggestion"), labour hours/rate, `taxPercent`, notes, jobNotes, lastDraftNotes, scopeFromAi, supplier, payment terms, validity and deposit. Saved on the device under `cq.projects.v1`.
- **Totals** (`totals()`): materials + labour, then one combined "Tax / markup %". There is **no separate markup** and **no shop supplies/other costs line** today.
- **Suppliers** (`src/lib/settings.ts`): a fixed list of Home Hardware Building Centre / RONA / Home Depot. The default supplier lives in preferences. Jobs keep their supplier, and older jobs use the current default.
- **AI** (`src/lib/scope.functions.ts` `draftScope`): one gateway call that sends up to 6 photos plus a hint. The prompt explicitly says **"never automotive or small-engine repair"**. `mergeDraft` (`src/lib/draft-merge.ts`, tested) replaces untouched AI lines and keeps contractor-owned lines exactly as they are.
- **Screens**: `src/routes/index.tsx` (job list, New job dialog), `src/routes/project.$id.tsx` (job editor), `src/routes/document.$id.tsx` (printable quote/invoice), `src/routes/settings.tsx`.

## 2. Smallest viable first release (Stage 1)

A job gets a **kind**: Contractor (the default) or Automotive. You pick it in the New job dialog. Nothing changes for contractor jobs.

An automotive job reuses the same job page and adds or changes these parts:
1. **Vehicle card**: year, make, model, engine/trim, an optional VIN/plate/unit number, an optional odometer reading, and an optional **Repair reference URL**. The link is saved with the job and opens in a new tab. JobPix never copies or stores the manual itself.
2. **Customer concern / technician notes**: the existing contractor notes field with an automotive label.
3. **AI findings (assistance only)**: one "Draft findings from photos" action. It gives a short list of findings, each marked Observed / Likely / Unknown with low/med/high confidence, and each tagged "Needs confirmation". It also suggests repairs and parts lines.
4. **Confirmation step**: each finding has Confirm / Edit / Remove. Suggested parts and repairs come in as **Proposed** (an "AI – not confirmed" badge) and only count as confirmed once you tap Confirm or edit them. The quote document can only be opened from the job once no proposed line is left unconfirmed. Unconfirmed lines are left off the document, with a clear warning shown.
5. **Estimate**: parts (name, part # optional, qty, price), labour hours × rate (same fields as today), **Shop supplies / other** (one editable amount), the existing Tax %, and totals. Every price is editable, and the AI never sets a final price; suggested prices start at 0.
6. **Parts supplier**: PartSource, Canadian Tire, or a custom name you type. For PartSource and Canadian Tire, "Check price" opens that store's search page. A custom supplier has no link. It is labelled "Based on {supplier} pricing — not live stock or pricing."
7. **Document**: for automotive jobs, a vehicle block (year/make/model/engine, VIN) and a Parts table appear. The Repair reference URL and AI confidence are **not** printed. Contractor documents stay exactly as they are.

**Deliberately not in Stage 1:** guided task walkthroughs (Stage 3, optional, off by default), any LEMON branding or integration, catalog/stock APIs, VIN decoding, scraping or hosting manuals, and automatic pricing or sending.

**Later stages:**
- Stage 2: a default automotive supplier and labour rate in Settings, and a reusable list of vehicles.
- Stage 3: an optional walkthrough setting, off by default.

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
- A job with no `kind` totals the same as before. Shop supplies are added before tax.
- Unconfirmed proposed parts are excluded from the document totals. Confirming or editing a part includes it.
- A redraft keeps confirmed and edited findings and parts exactly, and replaces only untouched AI lines.
- The automotive supplier choice never changes the contractor default.

**Preview checks**
- An existing contractor job is unchanged, including its document.
- A new automotive job: vehicle details and the Repair reference URL persist after reload, the link opens, and AI findings show their labels.
- The confirm flow works, the document shows the vehicle block, and the custom supplier is saved.

## 5. Decisions needed from you

1. **Original scope conflict:** JobPix was originally specified as "no automotive / small engine repair". Should automotive cover cars and light trucks only, or include small engines too?
2. **Markup:** today tax and markup share one percentage. Should automotive jobs get a separate parts markup %, or keep the combined field? Stage 1 assumes the combined field stays.
3. **Unconfirmed lines on the document:** should they be left off the document (assumed), or should the document be blocked until every line is confirmed?
4. **Labour:** is one hours × rate line per job enough (assumed), or do you need labour hours for each repair?

## Technical details

- `types.ts`:
  - New fields: `kind?: "contractor" | "automotive"`, `vehicle?: { year, make, model, engine, vin?, odometer?, referenceUrl? }`, `autoSupplier?: { key: "partsource" | "canadiantire" | "custom"; customName? }`, `shopSupplies?: number`, `findings?: Finding[]`.
  - `Material` gets an optional `partNumber` and `confirmed`.
  - `totals()` adds `shopSupplies ?? 0` to the subtotal, which leaves contractor jobs at 0.
- `settings.ts`: a separate `AUTO_SUPPLIERS` map. `SUPPLIERS` is left untouched.
- New `src/lib/auto.functions.ts` `draftAutoFindings`, a server function with its own prompt that includes the vehicle details and notes. It returns findings and proposed parts/repairs with status and confidence, and runs on the existing gateway path and model.
- New `src/lib/auto-merge.ts` plus tests, which reuse the `mergeDraft` ownership rules.
- New components `VehicleCard` and `FindingsList`. `project.$id.tsx` branches on `kind`, `document.$id.tsx` adds a vehicle block, and `index.tsx` gets a kind picker in the New job dialog.
- The repair reference URL is checked to be http(s) and rendered with `rel="noopener noreferrer"`.
- Record in AGENTS.md: "Job kind gates automotive UI; missing kind = contractor."
