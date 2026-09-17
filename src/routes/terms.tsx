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
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p>
            JobPix is a tool that helps you prepare quotes and invoices faster. Everything it
            suggests — the scope of work, the task list, the materials and the prices — is a draft
            for you to check.
          </p>
          <p>
            You are responsible for the quotes and invoices you send. Confirm quantities, prices,
            taxes and terms before giving a document to a client. JobPix does not check live supplier
            prices and does not guarantee that any suggestion is accurate or complete.
          </p>
          <p>
            JobPix is not a substitute for professional judgement, permits, inspections or legal and
            tax advice, and it is not intended for automotive or small engine repair work.
          </p>
          <p>
            The app is provided as is, without warranties. Your job data lives on your device, so
            keeping backups of important documents is up to you.
          </p>
        </div>
      </main>
    </div>
  );
}
