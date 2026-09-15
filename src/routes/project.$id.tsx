import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  FileOutput,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { draftScope } from "@/lib/scope.functions";
import {
  fileToCompressedDataUrl,
  getProject,
  storeSearchUrls,
  upsertProject,
} from "@/lib/storage";
import { money, totals, type Material, type Project } from "@/lib/types";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Job Scope & Pricing — JobPix" },
      {
        name: "description",
        content:
          "Add job-site photos, edit the AI-drafted scope of work, price materials and labor, and build the client total.",
      },
      { property: "og:title", content: "Job Scope & Pricing — JobPix" },
      {
        property: "og:description",
        content: "Edit the scope, price materials and labor, and build the client total.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

const uid = () => crypto.randomUUID();

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-4 shadow-panel sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = getProject(id);
    if (p) setProject(p);
    else setMissing(true);
  }, [id]);

  const update = useCallback((patch: Partial<Project>) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      upsertProject(next);
      return next;
    });
  }, []);

  if (missing) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl p-6 text-center">
          <p className="text-muted-foreground">That job no longer exists on this device.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Back to jobs
          </Button>
        </main>
      </div>
    );
  }

  if (!project) return <div className="min-h-screen" />;

  const t = totals(project);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const urls = await Promise.all(Array.from(files).map((f) => fileToCompressedDataUrl(f)));
      update({ photos: [...project.photos, ...urls].slice(0, 8) });
    } catch {
      toast.error("Couldn't read those photos");
    }
  };

  const runDraft = async () => {
    if (!project.photos.length) {
      toast.error("Add at least one photo first");
      return;
    }
    setDrafting(true);
    try {
      const result = await draftScope({
        data: { photos: project.photos.slice(0, 4), hint: project.scope },
      });
      update({
        scope: result.description || project.scope,
        tasks: [
          ...project.tasks,
          ...result.tasks.map((text) => ({ id: uid(), text })),
        ],
        materials: [
          ...project.materials,
          ...result.materials.map((m) => ({
            id: uid(),
            name: m.name,
            qty: m.qty || 1,
            price: m.price || 0,
          })),
        ],
      });
      toast.success("Draft scope added — edit anything you like");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed");
    } finally {
      setDrafting(false);
    }
  };

  const setMaterial = (mid: string, patch: Partial<Material>) =>
    update({
      materials: project.materials.map((m) => (m.id === mid ? { ...m, ...patch } : m)),
    });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> All jobs
        </Link>

        {/* Job details */}
        <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel sm:p-5">
          <Input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="h-12 border-0 px-0 text-2xl font-bold text-primary shadow-none focus-visible:ring-0"
            placeholder="Job name"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Client name</Label>
              <Input
                className="h-12"
                value={project.client}
                onChange={(e) => update({ client: e.target.value })}
                placeholder="Sarah Miller"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Job address</Label>
              <Input
                className="h-12"
                value={project.address}
                onChange={(e) => update({ address: e.target.value })}
                placeholder="42 Oak St"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["quote", "invoice"] as const).map((k) => (
              <Button
                key={k}
                onClick={() => update({ type: k })}
                variant="outline"
                className={`h-11 text-sm font-semibold capitalize ${
                  project.type === k
                    ? "border-ai bg-secondary text-primary shadow-none"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {k}
              </Button>
            ))}
          </div>
        </section>

        {/* Photos */}
        <Section title="Job photos">
          <div className="grid grid-cols-3 gap-2">
            {project.photos.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img
                  src={src}
                  alt={`Job site photo ${i + 1}`}
                  className="size-full rounded-md object-cover"
                />
                <button
                  aria-label="Remove photo"
                  onClick={() =>
                    update({ photos: project.photos.filter((_, idx) => idx !== i) })
                  }
                  className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => addPhotos(e.target.files)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => addPhotos(e.target.files)}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-12" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-5" /> Camera
            </Button>
            <Button
              variant="secondary"
              className="h-12"
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus className="size-5" /> Upload
            </Button>
          </div>
          <Button variant="action" className="mt-2 h-14 w-full text-base" onClick={runDraft} disabled={drafting}>
            {drafting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
            {drafting ? "Reading the photos…" : "Draft scope from photos"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            The AI draft is a rough first pass — check every line and price before sending.
          </p>
        </Section>

        {/* Scope */}
        <Section title="Scope of work">
          <Textarea
            value={project.scope}
            onChange={(e) => update({ scope: e.target.value })}
            placeholder="Describe the work needed…"
            className="min-h-28 text-base"
          />
          <div className="mt-4 space-y-2">
            {project.tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2">
                <Textarea
                  value={task.text}
                  onChange={(e) =>
                    update({
                      tasks: project.tasks.map((x) =>
                        x.id === task.id ? { ...x, text: e.target.value } : x,
                      ),
                    })
                  }
                  className="min-h-11 flex-1 resize-none py-2.5 text-base"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-muted-foreground"
                  aria-label="Delete task"
                  onClick={() =>
                    update({ tasks: project.tasks.filter((x) => x.id !== task.id) })
                  }
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="mt-3 h-12 w-full"
            onClick={() => update({ tasks: [...project.tasks, { id: uid(), text: "" }] })}
          >
            <Plus className="size-5" /> Add task
          </Button>
        </Section>

        {/* Materials */}
        <Section title="Materials">
          <div className="space-y-3">
            {project.materials.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={m.name}
                    onChange={(e) => setMaterial(m.id, { name: e.target.value })}
                    placeholder="Material name"
                    className="h-11 flex-1 text-base"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground"
                    aria-label="Delete material"
                    onClick={() =>
                      update({ materials: project.materials.filter((x) => x.id !== m.id) })
                    }
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-[5rem_1fr_auto] items-end gap-2">
                  <div className="space-y-1">
                    <Label className="label-caps">Qty</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={m.qty}
                      onChange={(e) => setMaterial(m.id, { qty: Number(e.target.value) })}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="label-caps">Unit price</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={m.price || ""}
                      onChange={(e) => setMaterial(m.id, { price: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-11 text-base"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="h-11" disabled={!m.name.trim()}>
                        <Search className="size-4" /> Price
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Search this item at</DropdownMenuLabel>
                      {storeSearchUrls(m.name).map((s) => (
                        <DropdownMenuItem key={s.label} asChild>
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            {s.label}
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-2 text-right text-base font-bold text-primary">
                  {money((m.qty || 0) * (m.price || 0))}
                </p>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="mt-3 h-12 w-full"
            onClick={() =>
              update({
                materials: [...project.materials, { id: uid(), name: "", qty: 1, price: 0 }],
              })
            }
          >
            <Plus className="size-5" /> Add material
          </Button>
        </Section>

        {/* Labor */}
        <Section title="Labor">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-caps">Estimated hours</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={project.laborHours || ""}
                onChange={(e) => update({ laborHours: Number(e.target.value) })}
                placeholder="0"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Hourly rate</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={project.laborRate || ""}
                onChange={(e) => update({ laborRate: Number(e.target.value) })}
                placeholder="0"
                className="h-12 text-base"
              />
            </div>
          </div>
          <p className="mt-3 text-right text-lg font-bold text-primary">
            Labor subtotal {money(t.labor)}
          </p>
        </Section>

        {/* Totals */}
        <Section title="Totals">
          <div className="space-y-2 text-base">
            <Row label="Materials" value={money(t.materials)} />
            <Row label="Labor" value={money(t.labor)} />
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <Label className="label-caps">Tax / markup %</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={project.taxPercent || ""}
                onChange={(e) => update({ taxPercent: Number(e.target.value) })}
                placeholder="0"
                className="h-12 w-28 text-right text-base"
              />
            </div>
            <Row label="Tax / markup" value={money(t.tax)} />
            <div className="mt-3 border-t-2 border-attention pt-4">
              <span className="block text-xs font-semibold text-muted-foreground">Recommended price</span>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold text-primary">Total</span>
                <span className="text-4xl font-extrabold text-primary">{money(t.total)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label className="label-caps">Notes for the client</Label>
            <Textarea
              value={project.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Payment terms, timeline, exclusions…"
              className="min-h-20 text-base"
            />
          </div>
        </Section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Button
            size="lg"
            variant="action"
            className="h-14 w-full text-base"
            onClick={() => navigate({ to: "/document/$id", params: { id: project.id } })}
          >
            <FileOutput className="size-5" />
            Generate {project.type}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
