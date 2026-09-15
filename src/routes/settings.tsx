import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultContractor, loadContractor, saveContractor } from "@/lib/storage";
import type { Contractor } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Business Details — SiteQuote" },
      {
        name: "description",
        content:
          "Set the business name, phone, email and license number that appear on every quote and invoice you send.",
      },
      { property: "og:title", content: "Business Details — SiteQuote" },
      {
        property: "og:description",
        content: "Your contact details, printed on every quote and invoice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

const FIELDS: Array<{ key: keyof Contractor; label: string; placeholder: string }> = [
  { key: "business", label: "Business name", placeholder: "Rivera Home Repair" },
  { key: "name", label: "Your name", placeholder: "Danny Rivera" },
  { key: "phone", label: "Phone", placeholder: "(555) 204-8811" },
  { key: "email", label: "Email", placeholder: "danny@riverahomerepair.com" },
  { key: "address", label: "Address", placeholder: "118 Wallace Ave, Springfield" },
  { key: "license", label: "License / reg. number", placeholder: "LIC #48-22910" },
];

function Settings() {
  const [c, setC] = useState<Contractor>(defaultContractor);

  useEffect(() => setC(loadContractor()), []);

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
        <h1 className="mt-4 text-3xl font-bold text-primary">Business details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These print at the top of every quote and invoice.
        </p>

        <div className="mt-6 space-y-5 rounded-lg border border-border bg-card p-5 shadow-panel">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="label-caps" htmlFor={f.key}>
                {f.label}
              </Label>
              <Input
                id={f.key}
                className="h-12"
                placeholder={f.placeholder}
                value={c[f.key]}
                onChange={(e) => setC({ ...c, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <Button
          variant="action"
          className="mt-5 h-14 w-full text-base"
          onClick={() => {
            saveContractor(c);
            toast.success("Business details saved");
          }}
        >
          Save details
        </Button>
      </main>
    </div>
  );
}
