import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_LABELS, type ModelKey } from "@/lib/analysis";
import { clearAnalysisPhotos } from "@/lib/analysis-photos";
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL, diagnostics, mailto } from "@/lib/app-info";
import {
  defaultContractor,
  fileToCompressedDataUrl,
  loadContractor,
  saveContractor,
} from "@/lib/storage";
import {
  defaultPreferences,
  defaultQuoteDefaults,
  loadPreferences,
  loadQuoteDefaults,
  savePreferences,
  saveQuoteDefaults,
  type CurrencyCode,
  type Preferences,
  type QuoteDefaults,
  type ThemeChoice,
  type UnitSystem,
} from "@/lib/settings";
import type { Contractor } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — JobPix" },
      {
        name: "description",
        content:
          "Set your business profile, quote defaults, appearance, currency and units — and get help with JobPix.",
      },
      { property: "og:title", content: "Settings — JobPix" },
      {
        property: "og:description",
        content: "Business profile, quote defaults, preferences and support for JobPix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

const FIELDS: Array<{ key: keyof Contractor; label: string; placeholder: string }> = [
  { key: "business", label: "Business name", placeholder: "ABC Contracting" },
  { key: "name", label: "Owner / contact name", placeholder: "Danny Rivera" },
  { key: "phone", label: "Phone", placeholder: "306-555-5555" },
  { key: "email", label: "Email", placeholder: "danny@abccontracting.ca" },
  { key: "address", label: "Business address", placeholder: "118 Wallace Ave, Regina SK" },
  { key: "license", label: "License / reg. number", placeholder: "LIC #48-22910" },
];

const PROBLEM_CATEGORIES = [
  "Something isn't working",
  "Incorrect result",
  "App crash",
  "Other",
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <Button
          key={o.value}
          variant="outline"
          className={`h-11 text-sm font-semibold ${
            value === o.value
              ? "border-ai bg-secondary text-primary shadow-none"
              : "border-border bg-background text-muted-foreground"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function Settings() {
  const [c, setC] = useState<Contractor>(defaultContractor);
  const [defaults, setDefaults] = useState<QuoteDefaults>(defaultQuoteDefaults);
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState<string>("");
  const [idea, setIdea] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  // Built after the page is live, since it embeds device details the server doesn't have.
  const [contactHref, setContactHref] = useState(`mailto:${SUPPORT_EMAIL}`);

  useEffect(() => {
    setC(loadContractor());
    setDefaults(loadQuoteDefaults());
    setPrefs(loadPreferences());
    setContactHref(mailto(`${APP_NAME} question`, diagnostics("Settings")));
  }, []);

  const updatePrefs = (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
    if (patch.keepSharpPhotos === false) {
      // Only the separate analysis-copy store is cleared; job photos are untouched.
      void clearAnalysisPhotos();
      toast.success("Sharper copies removed — your job photos are unchanged");
      return;
    }
    toast.success("Preference saved");
  };

  const pickLogo = async (file?: File | null) => {
    if (!file) return;
    try {
      setC({ ...c, logo: await fileToCompressedDataUrl(file, 480) });
      toast.success("Logo added — remember to save");
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const sendProblem = () => {
    const body = [
      problem.trim(),
      "",
      category ? `Category: ${category}` : "",
      diagnostics("Settings"),
    ].join("\n");
    window.location.href = mailto(`${APP_NAME} problem report`, body);
  };

  const sendIdea = () => {
    const body = [idea.trim(), "", ideaNotes.trim(), diagnostics("Settings")].join("\n");
    window.location.href = mailto(`${APP_NAME} feature idea`, body);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> All jobs
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-primary">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set it once — JobPix uses it on every quote you make.
        </p>

        {/* BUSINESS */}
        <Section
          title="Business profile"
          description="This goes on the top of every customer quote and invoice automatically."
        >
          <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-panel">
            <div className="space-y-2">
              <Label className="label-caps">Business logo</Label>
              <div className="flex items-center gap-3">
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt="Your business logo"
                    className="size-16 rounded-md border border-border object-contain p-1"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                    <ImagePlus className="size-6" />
                  </span>
                )}
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickLogo(e.target.files?.[0])}
                />
                <Button variant="secondary" className="h-11" onClick={() => logoRef.current?.click()}>
                  {c.logo ? "Replace" : "Add logo"}
                </Button>
                {c.logo ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove logo"
                    className="size-11 text-muted-foreground"
                    onClick={() => setC({ ...c, logo: "" })}
                  >
                    <Trash2 className="size-5" />
                  </Button>
                ) : null}
              </div>
            </div>

            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="label-caps" htmlFor={f.key}>
                  {f.label}
                </Label>
                <Input
                  id={f.key}
                  className="h-12"
                  placeholder={f.placeholder}
                  value={(c[f.key] as string) ?? ""}
                  onChange={(e) => setC({ ...c, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button
            variant="action"
            className="mt-4 h-14 w-full text-base"
            onClick={() => {
              saveContractor(c);
              toast.success("Business profile saved");
            }}
          >
            Save business profile
          </Button>
        </Section>

        <Section
          title="Quote defaults"
          description="New jobs start with these numbers. You can still change them on any single quote."
        >
          <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="label-caps" htmlFor="rate">
                  Labour rate / hour
                </Label>
                <Input
                  id="rate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="h-12"
                  value={defaults.laborRate || ""}
                  onChange={(e) => setDefaults({ ...defaults, laborRate: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps" htmlFor="tax">
                  Tax rate %
                </Label>
                <Input
                  id="tax"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="h-12"
                  value={defaults.taxPercent || ""}
                  onChange={(e) => setDefaults({ ...defaults, taxPercent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps" htmlFor="validity">
                  Quote valid for (days)
                </Label>
                <Input
                  id="validity"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="h-12"
                  value={defaults.validityDays || ""}
                  onChange={(e) =>
                    setDefaults({ ...defaults, validityDays: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps" htmlFor="deposit">
                  Deposit %
                </Label>
                <Input
                  id="deposit"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  className="h-12"
                  value={defaults.depositPercent || ""}
                  onChange={(e) =>
                    setDefaults({ ...defaults, depositPercent: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps" htmlFor="terms">
                Payment terms
              </Label>
              <Input
                id="terms"
                className="h-12"
                placeholder="Net 15 — payable on completion"
                value={defaults.paymentTerms}
                onChange={(e) => setDefaults({ ...defaults, paymentTerms: e.target.value })}
              />
            </div>
          </div>
          <Button
            variant="action"
            className="mt-4 h-14 w-full text-base"
            onClick={() => {
              saveQuoteDefaults(defaults);
              toast.success("Quote defaults saved");
            }}
          >
            Save quote defaults
          </Button>
        </Section>

        {/* PREFERENCES */}
        <Section title="Preferences">
          <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-panel">
            <div className="space-y-2">
              <Label className="label-caps">Appearance</Label>
              <Choice<ThemeChoice>
                value={prefs.theme}
                onChange={(theme) => updatePrefs({ theme })}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="label-caps">Currency</Label>
              <Choice<CurrencyCode>
                value={prefs.currency}
                onChange={(currency) => updatePrefs({ currency })}
                options={[
                  { value: "CAD", label: "CAD" },
                  { value: "USD", label: "USD" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="label-caps">Measurements</Label>
              <Choice<UnitSystem>
                value={prefs.units}
                onChange={(units) => updatePrefs({ units })}
                options={[
                  { value: "imperial", label: "Imperial" },
                  { value: "metric", label: "Metric" },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Photo analysis"
          description="Which AI looks at your photos first. The other one is always available as a second opinion."
        >
          <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-panel">
            <div className="space-y-2">
              <Label className="label-caps">Analyse with</Label>
              <Choice<ModelKey>
                value={prefs.analysisModel}
                onChange={(analysisModel) => updatePrefs({ analysisModel })}
                options={[
                  { value: "openai", label: MODEL_LABELS.openai },
                  { value: "google", label: MODEL_LABELS.google },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="label-caps">Keep sharper photo copies</Label>
              <Choice<"yes" | "no">
                value={prefs.keepSharpPhotos ? "yes" : "no"}
                onChange={(v) => updatePrefs({ keepSharpPhotos: v === "yes" })}
                options={[
                  { value: "yes", label: "Keep" },
                  { value: "no", label: "Don't keep" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Sharper copies help the analysis read detail, and use more space on this device.
                Your job photos are never affected either way.
              </p>
            </div>
          </div>
        </Section>

        {/* HELP & SUPPORT */}
        <Section title="How JobPix works">
          <ol className="space-y-2 rounded-lg border border-border bg-card p-5 text-sm leading-relaxed shadow-panel">
            {[
              "Take photos of the job.",
              "JobPix looks at the job for you.",
              "Review the suggested work and pricing.",
              "Change anything that isn't right.",
              "Generate the customer quote.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Report a problem"
          description="Tell us what went wrong and we'll get an email with the details."
        >
          <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-panel">
            <Textarea
              placeholder="What happened?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="min-h-24 text-base"
            />
            <div className="space-y-2">
              <Label className="label-caps">Type (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {PROBLEM_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant="outline"
                    className={`h-10 text-sm font-semibold ${
                      category === cat
                        ? "border-ai bg-secondary text-primary shadow-none"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                    onClick={() => setCategory(category === cat ? "" : cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              variant="secondary"
              className="h-12 w-full"
              disabled={!problem.trim()}
              onClick={sendProblem}
            >
              Send problem report
            </Button>
          </div>
        </Section>

        <Section title="Suggest a feature" description="What would make JobPix more useful for you?">
          <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-panel">
            <Textarea
              placeholder="Your idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="min-h-20 text-base"
            />
            <Textarea
              placeholder="Anything else to add (optional)"
              value={ideaNotes}
              onChange={(e) => setIdeaNotes(e.target.value)}
              className="min-h-16 text-base"
            />
            <Button
              variant="secondary"
              className="h-12 w-full"
              disabled={!idea.trim()}
              onClick={sendIdea}
            >
              Send idea
            </Button>
          </div>
        </Section>

        <Section title="Contact us">
          <a
            href={contactHref}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm font-semibold text-primary shadow-panel"
          >
            <Mail className="size-5 text-ai" />
            {SUPPORT_EMAIL}
          </a>
        </Section>

        {/* ABOUT */}
        <section className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground">
          <p className="leading-relaxed">
            JobPix turns job-site photos into professional quotes and invoices. Take the pictures —
            let JobPix do the work. Your jobs and business details stay on this device.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="font-medium underline underline-offset-4">
              Privacy policy
            </Link>
            <Link to="/terms" className="font-medium underline underline-offset-4">
              Terms of service
            </Link>
            <span>
              {APP_NAME} v{APP_VERSION}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
