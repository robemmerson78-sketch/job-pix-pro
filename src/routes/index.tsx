import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, FileText, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProject, duplicateProject, loadProjects, upsertProject } from "@/lib/storage";
import { emptyProject, money, totals, type Project } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SiteQuote — Photo to Contractor Quote & Invoice" },
      {
        name: "description",
        content:
          "Snap job-site photos, get an AI-drafted scope of work, price materials and labor, and hand your client a clean printable quote or invoice.",
      },
      { property: "og:title", content: "SiteQuote — Photo to Contractor Quote & Invoice" },
      {
        property: "og:description",
        content:
          "Turn job-site photos into a professional, printable quote or invoice in minutes.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const sync = () => setProjects(loadProjects());
    sync();
    window.addEventListener("cq:projects", sync);
    return () => window.removeEventListener("cq:projects", sync);
  }, []);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = emptyProject(trimmed);
    upsertProject(p);
    setName("");
    setOpen(false);
    navigate({ to: "/project/$id", params: { id: p.id } });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        <h1 className="text-3xl font-bold uppercase">Your jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos in, priced quote out. Everything stays on this device.
        </p>

        {projects.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-panel">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold uppercase">No jobs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a job, add a few photos, and let the AI draft your scope of work.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {projects.map((p) => {
              const t = totals(p);
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-card shadow-panel transition-shadow"
                >
                  <button
                    className="flex w-full items-center gap-3 p-4 text-left"
                    onClick={() => navigate({ to: "/project/$id", params: { id: p.id } })}
                  >
                    {p.photos[0] ? (
                      <img
                        src={p.photos[0]}
                        alt={`${p.name} job site`}
                        className="size-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                        <ReceiptText className="size-6" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-semibold">
                        {p.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {p.client || "No client yet"} ·{" "}
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-lg font-bold">
                        {money(t.total)}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          p.type === "invoice"
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {p.type}
                      </span>
                    </span>
                  </button>
                  <div className="flex justify-end gap-1 border-t border-border px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        duplicateProject(p.id);
                        toast.success("Job duplicated");
                      }}
                    >
                      <Copy className="size-4" /> Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id);
                      }}
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-14 w-full text-base">
                <Plus className="size-5" /> New job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Name this job</DialogTitle>
              </DialogHeader>
              <Input
                autoFocus
                placeholder="e.g. Miller — 42 Oak St deck repair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                className="h-12"
              />
              <DialogFooter>
                <Button onClick={create} disabled={!name.trim()} className="h-12 w-full">
                  Start job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
