import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — JobPix" },
      {
        name: "description",
        content:
          "The terms for using JobPix: you are responsible for checking every price and scope line before sending a quote.",
      },
      { property: "og:title", content: "Terms of Service — JobPix" },
      {
        property: "og:description",
        content: "Check every price and scope line before sending a quote to a client.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Settings
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-primary">Terms of service</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: November 2026</p>
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p>
            JobPix is a tool that helps you prepare quotes and invoices faster. Everything the AI
            suggests — the scope of work, tasks, materials, quantities, prices and clarification
            questions — is a draft for you to check. AI suggestions can be wrong or incomplete.
          </p>
          <p>
            Material prices are rough AI estimates, not prices from any supplier. JobPix does not
            check live supplier prices or stock. "Check price" only opens the supplier's own search
            page.
          </p>
          <p>
            You are responsible for the quotes and invoices you send. Confirm the work, quantities,
            prices, taxes and terms before giving a document to a client.
          </p>
          <p>
            JobPix is not a substitute for professional judgement, permits, inspections or legal and
            tax advice, and it is not intended for automotive or small engine repair work.
          </p>
          <p>
            AI features are subject to usage limits to prevent misuse, and may be unavailable at
            times. Don't use JobPix to send AI requests that aren't for your own jobs.
          </p>
          <p>
            The app is provided as is, without warranties. Your job data lives only on your device;
            keeping backups (Settings → Backup &amp; restore) and copies of important documents is
            up to you.
          </p>
        </div>
      </main>
    </div>
  );
}
