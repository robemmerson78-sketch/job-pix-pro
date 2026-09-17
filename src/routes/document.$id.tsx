import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getProject, loadContractor } from "@/lib/storage";
import { money, totals, type Contractor, type Project } from "@/lib/types";
import { defaultContractor } from "@/lib/storage";

export const Route = createFileRoute("/document/$id")({
  head: () => ({
    meta: [
      { title: "Printable Quote & Invoice — JobPix" },
      {
        name: "description",
        content:
          "A clean, printable contractor quote or invoice with itemized materials, labor and totals, ready to print, save as PDF or share.",
      },
      { property: "og:title", content: "Printable Quote & Invoice — JobPix" },
      {
        property: "og:description",
        content: "Itemized materials, labor and totals, ready to print or share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentPage,
});

function DocumentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [c, setC] = useState<Contractor>(defaultContractor);

  useEffect(() => {
    setProject(getProject(id) ?? null);
    setC(loadContractor());
  }, [id]);

  if (!project) return <div className="min-h-screen" />;

  const t = totals(project);
  const heading = project.type === "invoice" ? "Invoice" : "Quote";
  const ref = project.id.slice(0, 8).toUpperCase();

  const share = async () => {
    const lines = [
      `${heading} — ${project.name}`,
      c.business || c.name,
      "",
      project.scope,
      "",
      ...project.materials.map(
        (m) => `• ${m.name} ×${m.qty} — ${money((m.qty || 0) * (m.price || 0))}`,
      ),
      `Labor: ${project.laborHours} hrs @ ${money(project.laborRate)} = ${money(t.labor)}`,
      `Total: ${money(t.total)}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: `${heading} — ${project.name}`, text: lines });
      else {
        await navigator.clipboard.writeText(lines);
        toast.success("Copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 pb-28">
      <div className="no-print sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <button
            onClick={() => navigate({ to: "/project/$id", params: { id: project.id } })}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Edit job
          </button>
        </div>
      </div>

      <article className="print-sheet mx-auto my-6 max-w-3xl border border-border bg-card p-6 shadow-panel sm:p-10">
        {c.logo ? (
          <img src={c.logo} alt="" className="mb-4 h-14 w-auto max-w-[12rem] object-contain" />
        ) : (
          <div className="mb-6 h-2 w-20 rounded-sm bg-ai" />
        )}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-primary">{c.business || c.name || "Your business"}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {c.business && c.name ? <div>{c.name}</div> : null}
              {c.address ? <div>{c.address}</div> : null}
              {c.phone ? <div>{c.phone}</div> : null}
              {c.email ? <div>{c.email}</div> : null}
              {c.license ? <div>{c.license}</div> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {heading}
            </div>
            <div className="text-sm text-muted-foreground">Ref {ref}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="label-caps">Prepared for</div>
            <div className="mt-1 font-medium">{project.client || "—"}</div>
            {project.address ? (
              <div className="text-sm text-muted-foreground">{project.address}</div>
            ) : null}
          </div>
          <div>
            <div className="label-caps">Job</div>
            <div className="mt-1 font-medium">{project.name}</div>
          </div>
        </section>

        {project.scope ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-primary">Scope of work</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{project.scope}</p>
          </section>
        ) : null}

        {project.tasks.length ? (
          <section className="mt-4">
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {project.tasks
                .filter((task) => task.text.trim())
                .map((task) => (
                  <li key={task.id}>{task.text}</li>
                ))}
            </ul>
          </section>
        ) : null}

        {project.materials.length ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-primary">Materials</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="label-caps py-1.5">Item</th>
                  <th className="label-caps py-1.5 text-right">Qty</th>
                  <th className="label-caps py-1.5 text-right">Unit</th>
                  <th className="label-caps py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {project.materials.map((m) => (
                  <tr key={m.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-2">{m.name || "—"}</td>
                    <td className="py-1.5 text-right">{m.qty}</td>
                    <td className="py-1.5 text-right">{money(m.price || 0)}</td>
                    <td className="py-1.5 text-right">
                      {money((m.qty || 0) * (m.price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-primary">Labor</h2>
          <div className="mt-1 flex justify-between text-sm">
            <span>
              {project.laborHours} hrs @ {money(project.laborRate)}/hr
            </span>
            <span>{money(t.labor)}</span>
          </div>
        </section>

        <section className="mt-6 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Materials</span>
            <span>{money(t.materials)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Labor</span>
            <span>{money(t.labor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax / markup ({project.taxPercent}%)</span>
            <span>{money(t.tax)}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-attention pt-3 text-primary">
            <span className="text-lg font-bold">Total</span>
            <span className="text-3xl font-extrabold">{money(t.total)}</span>
          </div>
          {project.depositPercent ? (
            <div className="flex justify-between pt-1 font-semibold">
              <span>Deposit due ({project.depositPercent}%)</span>
              <span>{money((t.total * project.depositPercent) / 100)}</span>
            </div>
          ) : null}
        </section>

        {project.paymentTerms || (project.type === "quote" && project.validityDays) ? (
          <section className="mt-8 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {project.paymentTerms ? (
              <div>
                <div className="label-caps">Payment terms</div>
                <div className="mt-1">{project.paymentTerms}</div>
              </div>
            ) : null}
            {project.type === "quote" && project.validityDays ? (
              <div>
                <div className="label-caps">Quote valid for</div>
                <div className="mt-1">{project.validityDays} days from the date above</div>
              </div>
            ) : null}
          </section>
        ) : null}

        {project.notes ? (
          <section className="mt-8 border-t border-border pt-4">
            <div className="label-caps">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{project.notes}</p>
          </section>
        ) : null}

        <section className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="h-10 border-b border-primary" />
            <div className="label-caps mt-1.5">
              {c.business || c.name || "Contractor"} signature
            </div>
          </div>
          <div>
            <div className="h-10 border-b border-primary" />
            <div className="label-caps mt-1.5">Date</div>
          </div>
          {project.type === "quote" ? (
            <>
              <div>
                <div className="h-10 border-b border-primary" />
                <div className="label-caps mt-1.5">
                  Client signature{project.client ? ` — ${project.client}` : ""}
                </div>
              </div>
              <div>
                <div className="h-10 border-b border-primary" />
                <div className="label-caps mt-1.5">Date</div>
              </div>
            </>
          ) : null}
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
          <span className="max-w-xl">
            {project.type === "quote"
              ? "This quote is an estimate based on the work visible at the time of assessment. Hidden damage or changes to scope may affect the final price."
              : "Thank you for your business. Payment is due on the terms noted above."}
          </span>
          <span className="shrink-0 font-semibold text-primary">Prepared with JobPix</span>
        </footer>
      </article>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button variant="secondary" className="h-14 flex-1 text-base" onClick={share}>
            <Share2 className="size-5" /> Share
          </Button>
          <Button variant="action" className="h-14 flex-1 text-base" onClick={() => window.print()}>
            <Printer className="size-5" /> Print / PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
