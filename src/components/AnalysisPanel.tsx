import { useState } from "react";
import { Check, Loader2, ScanSearch, SquarePlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AnalysisComparison } from "@/components/AnalysisComparison";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  MODEL_LABELS,
  MODEL_PHOTO_LIMITS,
  STATUS_LABELS,
  groupByCategory,
  itemToLine,
  mergeAnalysis,
  otherModel,
  statusCounts,
  toReport,
  type AnalysisItem,
  type ModelKey,
  type ProjectAnalysis,
} from "@/lib/analysis";
import { getAnalysisPhotos } from "@/lib/analysis-photos";
import { analyzePhotos } from "@/lib/analysis.functions";
import { useHydratedPreferences } from "@/lib/settings";
import type { Project } from "@/lib/types";

const uid = () => crypto.randomUUID();

const statusStyle: Record<AnalysisItem["status"], string> = {
  observed: "bg-secondary text-primary",
  estimated: "bg-attention/15 text-attention-foreground",
  unknown: "bg-muted text-muted-foreground",
  confirmed: "bg-ai/15 text-ai",
};

export function AnalysisPanel({
  project,
  update,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
}) {
  const prefs = useHydratedPreferences();
  const first = prefs.analysisModel;
  const second = otherModel(first);
  const [running, setRunning] = useState<ModelKey | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const analysis: ProjectAnalysis = project.analysis ?? { reports: {}, items: [] };
  const photoCount = project.photos.length;
  const limit = Math.min(MODEL_PHOTO_LIMITS[first], MODEL_PHOTO_LIMITS[second]);
  const excluded = Math.max(0, photoCount - limit);

  const setAnalysis = (next: ProjectAnalysis) => update({ analysis: next });

  const run = async (model: ModelKey) => {
    if (!photoCount) {
      toast.error("Add at least one photo first");
      return;
    }
    setRunning(model);
    try {
      const ids = project.photoIds ?? [];
      const sharp = ids.length ? await getAnalysisPhotos(ids) : {};
      // Sharper copy when one exists, otherwise the job's own stored photo.
      const all = project.photos.map((p, i) => sharp[ids[i] ?? ""] ?? p);
      const photos = all.slice(0, MODEL_PHOTO_LIMITS[model]);

      const raw = await analyzePhotos({
        data: {
          photos,
          model,
          hint: project.scope || undefined,
          units: prefs.units,
        },
      });

      const report = toReport(raw, model, photos.length);
      const items = mergeAnalysis(analysis.items, report);
      setAnalysis({ reports: { ...analysis.reports, [model]: report }, items });

      const counts = statusCounts(report.items);
      setSummary(
        `${MODEL_LABELS[model]} analysed ${photos.length} of ${photoCount} photo${
          photoCount === 1 ? "" : "s"
        } — ${counts.observed} observed, ${counts.estimated} estimated, ${counts.unknown} unknown.`,
      );
      toast.success("Analysis ready — review and confirm each line");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo analysis failed");
    } finally {
      setRunning(null);
    }
  };

  const patchItem = (id: string, patch: Partial<AnalysisItem>) =>
    setAnalysis({
      ...analysis,
      items: analysis.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });

  const removeItem = (id: string) =>
    setAnalysis({
      ...analysis,
      items: analysis.items.filter((i) => i.id !== id && i.suggestionFor !== id),
    });

  /** Contractor-driven only: appends to the quote, never replaces existing lines. */
  const useInQuote = (item: AnalysisItem) => {
    if (item.category === "material") {
      update({
        materials: [
          ...project.materials,
          { id: uid(), name: item.text, qty: item.qty && item.qty > 0 ? item.qty : 1, price: 0 },
        ],
      });
      toast.success("Added to materials — set the price yourself");
      return;
    }
    update({ tasks: [...project.tasks, { id: uid(), text: itemToLine(item) }] });
    toast.success("Added to the task list");
  };

  const groups = groupByCategory(analysis.items);
  const counts = statusCounts(analysis.items);
  const reportA = analysis.reports[first];
  const reportB = analysis.reports[second];

  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-4 shadow-panel sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <ScanSearch className="size-5 text-ai" />
        <h2 className="text-xl font-semibold text-primary">Photo analysis</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {photoCount === 0
          ? "Add photos above, then analyse them for a working breakdown of the job."
          : excluded === 0
            ? `${photoCount} photo${photoCount === 1 ? "" : "s"} ready for analysis — all ${photoCount} will be analysed.`
            : `${photoCount} photos ready — photos 1–${limit} will be analysed, photos ${limit + 1}–${photoCount} will not.`}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          variant="action"
          className="h-14 text-base"
          disabled={running !== null || photoCount === 0}
          onClick={() => run(first)}
        >
          {running === first ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ScanSearch className="size-5" />
          )}
          {running === first ? "Analysing photos…" : `Analyse photos (${MODEL_LABELS[first]})`}
        </Button>
        <Button
          variant="secondary"
          className="h-14 text-base"
          disabled={running !== null || photoCount === 0}
          onClick={() => run(second)}
        >
          {running === second ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Users className="size-5" />
          )}
          {running === second ? "Second opinion…" : `Second opinion (${MODEL_LABELS[second]})`}
        </Button>
      </div>

      {summary ? <p className="mt-2 text-xs text-muted-foreground">{summary}</p> : null}

      {analysis.items.length ? (
        <>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            {analysis.items.filter((i) => !i.suggestionFor).length} findings · {counts.confirmed}{" "}
            confirmed by you. Nothing reaches the customer document until you add it.
          </p>

          {groups.map((group) => {
            const isChecklist = group.category === "question";
            return (
            <div
              key={group.category}
              className={isChecklist ? "mt-5 rounded-lg border-l-4 border-attention bg-muted/40 p-3" : "mt-4"}
            >
              <div className="label-caps">
                {isChecklist ? "On-site checklist — confirm with the customer" : CATEGORY_LABELS[group.category]}
              </div>
              {isChecklist ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Questions to check before pricing. These never go on the quote.
                </p>
              ) : null}
              <ul className="mt-1 space-y-2">
                {group.items.map((item) => {
                  const suggestions = analysis.items.filter((s) => s.suggestionFor === item.id);
                  if (isChecklist) {
                    const done = item.status === "confirmed";
                    return (
                      <li key={item.id} className="flex items-start gap-2 rounded-md bg-card p-2.5">
                        <button
                          type="button"
                          aria-label={done ? "Mark as not checked" : "Mark as checked"}
                          onClick={() =>
                            patchItem(item.id, done
                              ? { status: "unknown", source: "contractor" }
                              : { status: "confirmed", source: "contractor" })
                          }
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border-2 ${
                            done ? "border-ai bg-ai text-primary-foreground" : "border-border"
                          }`}
                        >
                          {done ? <Check className="size-4" /> : null}
                        </button>
                        {editing === item.id ? (
                          <Input
                            autoFocus
                            className="h-11 flex-1 text-base"
                            defaultValue={item.text}
                            onBlur={(e) => {
                              patchItem(item.id, { text: e.target.value, source: "contractor" });
                              setEditing(null);
                            }}
                          />
                        ) : (
                          <p className={`flex-1 text-sm leading-relaxed ${done ? "text-muted-foreground line-through" : ""}`}>
                            {item.text}
                          </p>
                        )}
                        <Button variant="ghost" className="h-9 px-2 text-xs" onClick={() => setEditing(item.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove question"
                          className="size-9 text-muted-foreground"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id} className="rounded-md border border-border p-2.5">
                      {editing === item.id ? (
                        <Input
                          autoFocus
                          className="h-11 text-base"
                          defaultValue={item.text}
                          onBlur={(e) => {
                            patchItem(item.id, {
                              text: e.target.value,
                              status: "confirmed",
                              source: "contractor",
                            });
                            setEditing(null);
                          }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">
                          {item.text}
                          {item.qty != null ? (
                            <span className="font-semibold">
                              {" "}
                              — {item.qty}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
                          ) : null}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[item.status]}`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                        {item.status !== "confirmed" ? (
                          <Button
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            onClick={() =>
                              patchItem(item.id, { status: "confirmed", source: "contractor" })
                            }
                          >
                            <Check className="size-4" /> Confirm
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="h-9 px-3 text-xs"
                          onClick={() => setEditing(item.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 px-3 text-xs"
                          onClick={() => useInQuote(item)}
                        >
                          <SquarePlus className="size-4" /> Use in this quote
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove finding"
                          className="size-9 text-muted-foreground"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {suggestions.map((s) => (
                        <div
                          key={s.id}
                          className="mt-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground"
                        >
                          <span className="font-semibold">
                            {MODEL_LABELS[s.source as ModelKey] ?? "AI"} suggests:
                          </span>{" "}
                          {itemToLine(s)} — your confirmed line above is kept.
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {reportA && reportB ? <AnalysisComparison a={reportA} b={reportB} /> : null}
        </>
      ) : null}
    </section>
  );
}
