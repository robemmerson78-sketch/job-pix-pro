# AI Clarification Questions + safer material redrafts

(Plan only — no app code has been changed. Automotive estimating is set aside for now, and its decisions remain in this chat for a later plan.)

## What the code does today (checked)

- On the job page (`src/routes/project.$id.tsx`), "Draft scope from photos" (`runDraft`) sends the first 4 photos plus the contractor notes, the units and the supplier name to `draftScope` (`src/lib/scope.functions.ts`). The current scope and the current materials are **not** sent.
- `mergeDraft` (`src/lib/draft-merge.ts`) removes every untouched AI material (`ai: true`) and adds the fresh ones. A fresh item is skipped only if its name **exactly** matches a kept line.
- Editing a material's name, qty or price clears its `ai` tag (`setMaterial`), which makes the line contractor-owned.
- AI lines count in totals and print on the quote as soon as they arrive. There is no "unconfirmed" state and no "excluded / already owned" state.

**Why the paint/primer regression happened:**
- **Duplicate paint:** the edited paint line became contractor-owned and was kept. The AI did not know that line existed and returned a differently worded "Exterior paint …", which passed the exact-name check and was added.
- **Primer $25 → $55:** primer was still an untouched AI line, so the redraft replaced it with a fresh AI guess at a different price.

## What you will see

**1. A separate "AI Clarification Questions" box directly below "Contractor job description / notes".**
- The box has a "Check for questions" button. The AI looks at the photos, notes, current scope and current materials (with your prices and exclusions), then asks **0–5** short questions, only where the answer would change the work, the materials, the quantities or the price. A straightforward job shows "No questions — ready to draft."
- Each question is labelled "AI question — not a job fact". Under each one: a short answer box, plus **Not sure** and **Skip**. A question's wording can be edited, and it can be deleted.
- Your answers are sent with every "Draft scope from photos". If the notes are empty, drafting still works with no questions asked. The questions step is optional and never blocks drafting.
- When you check again, questions that are already answered or skipped are not asked again. They are re-asked only if the notes, photos or affected materials have changed since they were answered. "Not sure" questions can come back.
- Questions and answers are kept in a separate list. They never touch the notes box.

**2. Material lines get three clear states.**
- **Suggested (AI, not confirmed):** a badge plus **Confirm**. Editing the line also confirms it. Suggested lines are **left out of totals and the quote document** until confirmed, with a warning: "3 AI suggestions not confirmed — not in this quote."
- **Yours (confirmed or edited):** the name, qty and price are never changed by a redraft.
- **Excluded / customer not charged:** a new toggle, e.g. "Already owned — don't charge". The line stays visible on the job, its cost is $0 in totals, and it is not printed. A redraft won't re-add it.

**3. Safer redrafts.**
- Your lines are kept exactly, including the name, qty, price and excluded state.
- The AI is now told your current materials and prices, and is asked to return, for each item, whether it **matches one of your existing lines** (by line id) or is new.
  - A match to one of your lines adds nothing and never changes your price.
  - A match to an untouched suggested line updates that suggestion in place. If its price differs from the old suggestion, the line shows "AI price changed $25 → $55", and keeping or using either price is a tap. The price is never silently overwritten.
- **Unsure matches go to review instead of duplicating.** If a fresh item looks like one of your lines (similar words, e.g. both mention "exterior paint") but the AI didn't claim a match, it lands in a small "Possible duplicates — review" list. From there you can **Add as new** or **Dismiss**. Nothing is auto-added.
- Failure safety stays as today: a failed draft changes nothing, and the merge is applied to the latest job state.

## Paint / primer example under the new rules
1. Draft: suggested Exterior paint $60 and Primer $25.
2. You edit the paint to $0, or mark it "Already owned — don't charge". It becomes yours. You confirm the primer at $25, so it is yours too.
3. Optionally, a clarification question: "Is the existing paint enough for the full area?" → "Yes".
4. Redraft: the AI sees your paint and primer lines. Its paint returns as a match, so nothing is added. Primer is a match, so it stays $25. Any loosely similar paint item goes to "Possible duplicates — review" and does not join the quote.

## Older jobs
- Lines saved before this change keep their current totals and print exactly as they do now. Untagged lines are treated as yours.
- Older AI-tagged lines get a "review" badge but still count until you confirm, edit or remove them.
- Test addition: an older job's total and printed quote are identical before and after the update.

## Acceptance tests
Automated (Bun, beside `draft-merge.test.ts`):
1. **Paint/primer:** edited paint at $0 plus confirmed primer at $25, then a redraft whose AI returns "Exterior paint" (different wording) and "Primer $55" → still one paint line at $0 and primer at $25. Any loose paint match goes to review, not to the quote.
2. An untouched suggestion whose fresh AI price differs is updated in place with a "price changed" flag, and the line count stays the same.
3. An excluded line stays excluded, costs $0, and is not re-added.
4. Unconfirmed suggestions are excluded from totals. Confirming or editing includes them.
5. Repeating redrafts with the same inputs does not grow the list.
6. Answered or skipped questions are not re-asked unless their inputs have changed.
7. Notes, photos, labour, tax, supplier, client details and document fields are identical after a merge.
8. A failed draft or question check leaves the job unchanged.

Preview checklist:
- The box sits below the notes, and its answer, Not sure, Skip and edit controls work.
- Answers persist after reload.
- The warning count is correct, and the document omits suggested and excluded lines.
- The review list behaves correctly.
- Live AI run (you): the full paint/primer scenario on a real job.

## Decisions (settled)
1. **Older jobs keep their current totals and quote behaviour.**
   - Untagged lines count as yours and confirmed.
   - Existing AI-tagged lines in older jobs keep counting in totals and keep printing, exactly as today. They show a small "AI suggestion — review" badge, with a Confirm button and the option to edit or remove the line.
   - Nothing about an older line changes until you act on it.
   - Only suggestions from drafts made after this change start out unconfirmed and left out of totals.
2. **Questions are asked only when you tap "Check for questions".** There is never an automatic AI call before a draft.

No open decisions remain.

## Technical details
- `types.ts` (all fields optional):
  - `Material`: `pending?: true` (new unconfirmed AI suggestion), `excluded?`, `aiPrevPrice?`
  - `Project`: `clarifications?: { id, question, answer?, status: "open" | "answered" | "unsure" | "skipped", askedFor: string /* input fingerprint */ }[]`, `pendingDuplicates?: Material[]`
  - `ai: true` keeps meaning "untouched suggestion" (replaceable on a redraft). Only lines that also carry `pending: true` are left out of totals. Older `ai: true` lines have no `pending` tag, so their totals are unchanged.
  - Confirm or any edit clears both `ai` and `pending`.
- New server function `askClarifications` in `src/lib/clarify.functions.ts`, on the same gateway path and model as `draftScope`.
  - It is called only from the "Check for questions" button.
  - Its input is photos, notes, scope, materials (id/name/qty/price/excluded/owned) and the prior Q&A.
  - Its output is strict JSON `{questions: string[]}` capped at 5.
- `draftScope`'s input gets optional `currentMaterials` and `answers`, and its output gets an optional `matchId` per material. The prompt adds the matching instruction. Old callers still work.
- `mergeDraft` gets the match-by-id rules, the in-place price-change flag, the excluded/owned protection, and a token-overlap check that routes unsure items to `pendingDuplicates`.
  - Fresh suggestions get `ai` and `pending`.
  - It stays a pure function.
- `totals()` skips `pending` and `excluded` lines, so older jobs are unaffected. `document.$id.tsx` filters the same lines and shows the warning.
- New `ClarificationsBox` component, placed under the notes field in `project.$id.tsx`.
- No new dependencies, and storage stays on this device.
