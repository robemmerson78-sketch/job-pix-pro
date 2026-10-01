import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, BriefcaseBusiness, Copy, FileText, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";
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
import {
  deleteProject,
  duplicateProject,
  loadContractor,
  loadProjects,
  upsertProject,
} from "@/lib/storage";
import { loadQuoteDefaults, useCurrency } from "@/lib/settings";
import { emptyProject, money, totals, type Project } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobPix — Photo to Contractor Quote & Invoice" },
      {
        name: "description",
        content:
          "Snap job-site photos, get an AI-drafted scope of work, price materials and labor, and hand your client a clean printable quote or invoice.",
      },
      { property: "og:title", content: "JobPix — Photo to Contractor Quote & Invoice" },
      {
        property: "og:description",
        content:
          "Turn job-site photos into a professional, printable quote or invoice in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const currency = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const projectValue = projects.reduce((sum, project) => sum + totals(project).total, 0);
  const quoteCount = projects.filter((project) => project.type === "quote").length;
  const invoiceCount = projects.length - quoteCount;

  const [profileDone, setProfileDone] = useState(true);

  useEffect(() => {
    const sync = () => setProjects(loadProjects());
    sync();
    const c = loadContractor();
    setProfileDone(Boolean(c.business.trim() || c.name.trim()));
    window.addEventListener("cq:projects", sync);
    return () => window.removeEventListener("cq:projects", sync);
  }, []);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = emptyProject(trimmed, loadQuoteDefaults());
    upsertProject(p);
    setName("");
    setOpen(false);
    navigate({ to: "/project/$id", params: { id: p.id } });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-7">
        <h1 className="text-3xl font-bold text-primary">Your jobs</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Photos in, priced quote out. Everything stays on this device.
        </p>

        <section aria-label="Job summary" className="mt-6 grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
          <div className="p-3.5 sm:p-4">
            <BriefcaseBusiness className="mb-2 size-4 text-ai" />
            <p className="text-xl font-extrabold text-primary">{projects.length}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Jobs</p>
          </div>
          <div className="border-x border-border p-3.5 sm:p-4">
            <ReceiptText className="mb-2 size-4 text-ai" />
            <p className="text-xl font-extrabold text-primary">{quoteCount}/{invoiceCount}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Quotes / invoices</p>
          </div>
          <div className="p-3.5 sm:p-4">
            <WalletCards className="mb-2 size-4 text-attention" />
            <p className="truncate text-xl font-extrabold text-primary">{money(projectValue, currency)}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Job value</p>
          </div>
        </section>

        {!profileDone ? (
          <Link
            to="/settings"
            className="mt-4 flex items-start gap-3 rounded-lg border border-attention/50 bg-attention/10 p-4"
          >
            <BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-attention-foreground" />
            <span>
              <span className="block text-base font-semibold text-primary">
                Complete your business profile
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                Add your business information so JobPix can automatically include it on your quotes.
              </span>
            </span>
          </Link>
        ) : null}

        {projects.length === 0 ? (
          <div className="mt-6 rounded-lg border border-border bg-card px-6 py-10 text-center shadow-panel">
            <span className="mx-auto flex size-14 items-center justify-center rounded-lg bg-secondary text-ai">
              <FileText className="size-7" />
            </span>
            <p className="mt-4 text-lg font-semibold text-primary">No jobs yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
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
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-panel transition-shadow hover:shadow-md"
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
                      <span className="block truncate text-lg font-semibold text-primary">
                        {p.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {p.client || "No client yet"} ·{" "}
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-lg font-extrabold text-primary">
                        {money(t.total, currency)}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          p.type === "invoice"
                            ? "bg-attention/20 text-attention-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {p.type}
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-wrap justify-end gap-1 border-t border-border px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: "/document/$id", params: { id: p.id } })}
                    >
                      <FileText className="size-4" /> Open {p.type}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-attention-foreground hover:text-attention-foreground"
                      onClick={() => {
                        upsertProject({ ...p, type: p.type === "quote" ? "invoice" : "quote" });
                        toast.success(
                          p.type === "quote" ? "Converted to invoice" : "Converted back to quote",
                        );
                      }}
                    >
                      <ArrowLeftRight className="size-4" />
                      {p.type === "quote" ? "To invoice" : "To quote"}
                    </Button>
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
              <Button variant="action" size="lg" className="h-14 w-full text-base">
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
