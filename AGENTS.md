<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Material ownership: `ai` = untouched AI line (replaceable on redraft), `pending` = new unconfirmed suggestion (excluded from totals/documents), no tag = contractor-owned and never changed by AI; all merging lives in the pure `src/lib/draft-merge.ts` — keeps redraft rules testable in one place.
