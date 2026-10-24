# Fix: redrafting the scope should replace old AI suggestions, not stack them

## What the code does today (re-checked 24 Oct against the current code; nothing has changed since the plan was first written)

- Where it lives: `runDraft`, `update`, `setMaterial`, the task edit/add/delete handlers and the description box in `src/routes/project.$id.tsx`, and `Task`/`Material`/`Project` in `src/lib/types.ts`. `draftScope` (`src/lib/scope.functions.ts`) only returns `{ description, tasks, materials }` and stays as it is.

- **Nothing records where a line came from.** A material is just `{ id, name, qty, price }` and a task is just `{ id, text }`. Lines the AI added look the same as lines the contractor typed or edited. There is also no record of which notes the last draft used.
- **All merging happens in one place:** `runDraft` on the job page.
  - The new description replaces the old one.
  - The new tasks replace all tasks, including any the contractor typed.
  - Materials are added on top of the existing list. Only names that match an existing name exactly are skipped. Old AI materials are never removed.
- **The notes do reach the AI.** The current text of "Contractor job description / notes" is sent with the first 4 photos. The notes box itself is never changed by a draft.
- **A failed draft changes nothing.** The job is only updated after the AI succeeds, and the button is re-enabled for another try.

## Why the test behaved this way

- **Changed notes, then redraft, showed nothing new:** most new material suggestions had the same names as the earlier AI items, so they were skipped. The earlier AI items also stayed, so the list looked unchanged. Whether the AI actually used the new notes can't be confirmed from the code alone. Problem in the code: old AI materials are never removed after the notes change.
- **Redraft with the same notes added products:** the AI words items differently each run (for example "PEX pipe 1/2 in" vs "1/2 in PEX tubing"). An exact-name check lets those through, so AI items pile up. Problem in the code: same cause.

## Data-loss risks in the current code

1. Typed or edited tasks are wiped on every redraft, because all tasks are replaced.
2. Edits made while a draft is running can be overwritten. The draft is applied to the job as it was when the button was pressed.
3. If the contractor rewrote the description, the next draft overwrites it.

## The fix

1. **Remember which lines came from the AI.** Each task or material the draft adds is tagged as an AI suggestion. When the contractor changes a line's name, quantity, price or text, the tag is removed and the line is theirs from then on. Lines added with "Add task" or "Add material" are never tagged.
2. **Redrafting replaces only untouched AI lines.**
   - Tagged tasks and materials are removed and the fresh suggestions are added.
   - Everything the contractor entered or edited stays exactly as it is.
   - A fresh suggestion is skipped if its name exactly matches a line that is being kept.
   - So redrafting with the same notes swaps old suggestions for new ones and cannot pile them up.
3. **Description.**
   - It is replaced while it is still the AI's text.
   - If the contractor has edited it, it is kept, and the message says "Your edited scope was kept".
4. **Old suggestions are flagged when the notes change.** The job remembers the notes the last draft used. If the notes box no longer matches, one line of small text appears under the button: "Notes changed since the last draft — draft again to update the suggestions."
   - Nothing is deleted at that point. The replacement only happens when the contractor redrafts.
   - The notes box itself is never cleared or altered.
5. **Apply the draft to the job's latest state.** The merge uses the job as it is when the AI answers, not as it was at the click. Edits made while waiting are kept.
6. **Failures stay safe.** The job is only changed after the AI succeeds, and the error message stays as it is now. Photos, labour, tax, supplier, client details and quote notes are never touched.

**Older jobs (saved before this fix):** nothing in them is tagged, so everything is treated as the contractor's and kept. This includes the description, tasks and materials.
- An empty description is the one exception: it is filled with the AI's description.
- **Limitation:** the first redraft on an older job adds the AI's new tasks and materials next to the existing ones instead of replacing them. Any duplicates already in the job also stay. The contractor deletes the old lines once by hand. After that, redrafts replace properly.
- Duplicating a job copies the tags with it, so the copy follows the same rules.

## Ownership rule (approved)

AI content can be replaced on a redraft only while nobody has edited it. Once the contractor edits it, it belongs to them and is kept exactly as is on every later draft. What counts as an edit:

| Item | Becomes the contractor's when | On a successful redraft |
|---|---|---|
| Scope of work text | any edit to the description box | kept word for word; the message says "Your edited scope was kept" |
| Task | its text is edited, or it was added with "Add task" | kept as is |
| Material | its name, qty or unit price is edited, or it was added with "Add material" | kept as is: name, qty and price |
| Untouched AI scope, task or material | never edited | replaced by the fresh AI results |
| Contractor job description / notes | always the contractor's | never cleared or changed by the app |
| Photos, labour hours and rate, tax, supplier, client and address, quote notes, payment terms, deposit, validity, document type | always the contractor's | never touched |

- Deleting an AI line removes it. It only comes back if a later draft suggests it again.
- **When the notes change:** the old AI results are only marked out of date, using the hint in step 4. Nothing is cleared until a new draft succeeds.
- **When a draft fails:** nothing changes, and the contractor can try again.
- **No pile-up:** each successful draft replaces all untouched AI lines. Repeating it with the same notes can't stack old suggestions or copies.

## Technical details

- `src/lib/types.ts`
  - Add an optional `ai?: true` to `Task` and `Material`.
  - Add `lastDraftNotes?: string` and `scopeFromAi?: boolean` to `Project`. All are optional, so saved jobs still load.
- New `src/lib/draft-merge.ts`: a pure `mergeDraft(project, result)` that returns the new `scope`, `tasks`, `materials`, `scopeFromAi` and `lastDraftNotes`, following the rules above.
- `src/routes/project.$id.tsx`
  - `update` also accepts `(prev) => patch`.
  - `runDraft` calls it with `mergeDraft` after the AI answers, and records the notes that were sent.
  - `setMaterial`, the task edit box and the description box drop the `ai` tag or set `scopeFromAi: false`.
  - Add the one-line stale-notes hint.
- Not changed: `draftScope` and its prompt, the photos sent (the first 4, as today), the storage layer, the quote/invoice document, Settings.
- No new dependencies. The rule tests run with Bun's built-in `bun test`.

## Test plan

Automated, in `src/lib/draft-merge.test.ts`:
1. First draft: the description is set, and the AI tasks and materials are added and tagged.
2. Redraft with the same notes: untouched AI lines are replaced and the list doesn't grow from repeats.
3. Changed notes: all untouched AI lines from the old draft are gone, and only the new suggestions remain.
4. Manual material (added by hand, or an AI line whose price or qty was edited) survives a redraft unchanged.
5. A typed or edited task survives a redraft.
6. An edited description is kept, while an AI description is replaced.
7. Labour, tax, photos, supplier and notes are identical before and after a merge.

In the preview (no AI needed): a failed draft leaves the job unchanged, and the stale-notes hint appears after editing the notes.

Needs a live photo/AI run, which you'll need to do: a real first draft, a redraft after changing the notes (check the new notes show up in the description or tasks), and two redrafts with the same notes (the materials count stays steady).

Manual checklist in the preview:
1. Draft, then change one material's price and one task's text. Redraft and check both are exactly the same.
2. Add a material and a task by hand. Redraft and check both are still there.
3. Edit the description. Redraft and check it is unchanged and the "kept" message shows.
4. Delete an AI material, then redraft. It only returns if the AI suggests it again.
5. Change the notes and check the hint appears and nothing is removed. Redraft, and the hint disappears.
6. Turn off the network and redraft. You should see an error and the job unchanged. Turn it back on and redraft, and it works.
7. While a draft is running, edit a material's price. Check the edit is still there after the draft finishes.
8. Check that labour, tax, supplier, client details, quote notes, terms, deposit, validity, quote/invoice type and photos are all unchanged.

## Risks and assumptions
- AI wording varies between runs. Only untouched AI lines are replaced, so a contractor-owned line and a fresh AI line can still describe the same item in different words. Fresh AI lines that match a kept line's name exactly are skipped, but there is no fuzzy matching, so the AI's legitimate products are never dropped.
- Only the first 4 photos are sent to the AI, which is how it works today. Changing that is outside this fix.
- No deviations from the approved requirements, no new dependencies, and no screens are redesigned.
