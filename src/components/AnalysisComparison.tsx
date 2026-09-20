import { Check, GitCompareArrows, User } from "lucide-react";

import {
  CATEGORY_LABELS,
  MODEL_LABELS,
  compareAnalyses,
  type AnalysisReport,
} from "@/lib/analysis";

function Line({ children }: { children: React.ReactNode }) {
  return <li className="border-b border-border/60 py-2 last:border-0">{children}</li>;
}

/** Side-by-side view of the two reports. The comparison itself is local and deterministic. */
export function AnalysisComparison({ a, b }: { a: AnalysisReport; b: AnalysisReport }) {
  const result = compareAnalyses(a, b);

  return (
    <div className="mt-4 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <GitCompareArrows className="size-4 text-ai" />
        <h3 className="text-sm font-semibold text-primary">
          {MODEL_LABELS[a.model]} vs {MODEL_LABELS[b.model]}
        </h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {result.agreed.length} agreed · {result.differs.length} differ ·{" "}
        {result.onlyA.length + result.onlyB.length} found by one model only. Compared on this
        device — no extra AI used.
      </p>

      {result.agreed.length ? (
        <div className="mt-3">
          <div className="label-caps flex items-center gap-1">
            <Check className="size-3.5 text-ai" /> Both models agree
          </div>
          <ul className="mt-1 text-sm">
            {result.agreed.map((p) => (
              <Line key={p.a.id}>
                <span className="text-muted-foreground">{CATEGORY_LABELS[p.a.category]}: </span>
                {p.a.text}
              </Line>
            ))}
          </ul>
        </div>
      ) : null}

      {result.differs.length ? (
        <div className="mt-3">
          <div className="label-caps text-attention">They differ</div>
          <ul className="mt-1 text-sm">
            {result.differs.map((p) => (
              <Line key={p.a.id}>
                <span className="text-muted-foreground">{CATEGORY_LABELS[p.a.category]}</span>
                <div className="mt-0.5">
                  <span className="font-medium">{MODEL_LABELS[a.model]}:</span> {p.a.text}
                  {p.a.qty != null ? ` (${p.a.qty} ${p.a.unit ?? ""})` : ""}
                </div>
                <div>
                  <span className="font-medium">{MODEL_LABELS[b.model]}:</span> {p.b.text}
                  {p.b.qty != null ? ` (${p.b.qty} ${p.b.unit ?? ""})` : ""}
                </div>
              </Line>
            ))}
          </ul>
        </div>
      ) : null}

      {[
        { report: a, items: result.onlyA },
        { report: b, items: result.onlyB },
      ]
        .filter((g) => g.items.length)
        .map((g) => (
          <div key={g.report.model} className="mt-3">
            <div className="label-caps flex items-center gap-1">
              <User className="size-3.5" /> Only {MODEL_LABELS[g.report.model]}
            </div>
            <ul className="mt-1 text-sm">
              {g.items.map((i) => (
                <Line key={i.id}>
                  <span className="text-muted-foreground">{CATEGORY_LABELS[i.category]}: </span>
                  {i.text}
                </Line>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
