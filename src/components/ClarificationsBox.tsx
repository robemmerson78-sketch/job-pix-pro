import { useState } from "react";
import { HelpCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askClarifications } from "@/lib/clarify.functions";
import { clarifyFingerprint, mergeClarifications } from "@/lib/draft-merge";
import type { Clarification, Project } from "@/lib/types";

const uid = () => crypto.randomUUID();

export function ClarificationsBox({
  project,
  update,
}: {
  project: Project;
  update: (patch: (prev: Project) => Partial<Project>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const list = project.clarifications ?? [];

  const setOne = (id: string, patch: Partial<Clarification>) =>
    update((prev) => {
      const fp = clarifyFingerprint(prev);
      return {
        clarifications: (prev.clarifications ?? []).map((c) =>
          c.id === id ? { ...c, ...patch, askedFor: fp } : c,
        ),
      };
    });

  const check = async () => {
    setBusy(true);
    try {
      const fp = clarifyFingerprint(project);
      const { questions } = await askClarifications({
        data: {
          photos: project.photos.slice(0, 4),
          notes: project.jobNotes ?? "",
          scope: project.scope,
          materials: project.materials.map((m) => ({
            name: m.name,
            qty: Number(m.qty) || 0,
            price: Number(m.price) || 0,
            owner: m.ai ? ("ai" as const) : ("contractor" as const),
            excluded: !!m.excluded,
          })),
          resolved: list
            .filter((c) => c.status === "answered" || c.status === "skipped")
            .map((c) => ({
              q: c.question,
              a: c.status === "skipped" ? "(skipped)" : (c.answer ?? ""),
              changedSince: c.askedFor !== fp,
            })),
        },
      });
      // Applied to the latest job state; a failure above leaves everything unchanged.
      update((prev) => ({
        clarifications: mergeClarifications(prev.clarifications ?? [], questions, clarifyFingerprint(prev), uid),
      }));
      setChecked(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't check for questions");
    } finally {
      setBusy(false);
    }
  };

  const open = list.filter((c) => c.status !== "answered" && c.status !== "skipped");

  return (
    <div className="mt-3 rounded-lg border border-dashed border-ai/50 bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <HelpCircle className="size-4 text-ai" /> AI Clarification Questions
        </p>
        <Button variant="secondary" size="sm" onClick={check} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Checking…" : "Check for questions"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional. AI questions are suggestions, not job facts. Your answers are used when you draft.
      </p>

      {checked && !open.length && !busy ? (
        <p className="mt-2 text-sm font-medium text-primary">No open questions — ready to draft.</p>
      ) : null}

      {list.length ? (
        <ul className="mt-3 space-y-3">
          {list.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-card p-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-2 shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                  AI question
                </span>
                <Input
                  aria-label="Question"
                  value={c.question}
                  onChange={(e) => setOne(c.id, { question: e.target.value })}
                  className="h-10 flex-1 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 text-muted-foreground"
                  aria-label="Delete question"
                  onClick={() =>
                    update((prev) => ({
                      clarifications: (prev.clarifications ?? []).filter((x) => x.id !== c.id),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                aria-label="Your answer"
                placeholder="Your answer"
                value={c.answer ?? ""}
                onChange={(e) =>
                  setOne(c.id, {
                    answer: e.target.value,
                    status: e.target.value.trim() ? "answered" : "open",
                  })
                }
                className="mt-2 h-10 text-sm"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  variant={c.status === "unsure" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOne(c.id, { status: "unsure", answer: "" })}
                >
                  Not sure
                </Button>
                <Button
                  variant={c.status === "skipped" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOne(c.id, { status: "skipped", answer: "" })}
                >
                  Skip
                </Button>
                <span className="text-xs text-muted-foreground">
                  {c.status === "answered"
                    ? "Answered"
                    : c.status === "unsure"
                      ? "Not sure — may be asked again"
                      : c.status === "skipped"
                        ? "Skipped"
                        : "Open"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Answers sent with a draft as contractor context. */
export const draftAnswers = (p: Project) =>
  (p.clarifications ?? [])
    .filter((c) => c.status === "answered" || c.status === "unsure")
    .map((c) => ({ q: c.question, a: c.status === "unsure" ? "Not sure" : (c.answer ?? "") }));
