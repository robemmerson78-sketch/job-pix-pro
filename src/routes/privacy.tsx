import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { SUPPORT_EMAIL } from "@/lib/app-info";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — JobPix" },
      {
        name: "description",
        content:
          "How JobPix handles your information: jobs, photos and business details stay on your own device.",
      },
      { property: "og:title", content: "Privacy Policy — JobPix" },
      {
        property: "og:description",
        content: "Your jobs, photos and business details stay on your own device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
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
        <h1 className="mt-4 text-3xl font-bold text-primary">Privacy policy</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p>
            JobPix keeps your jobs, photos, business profile and quote defaults in your own browser
            storage on this device. There is no JobPix account and no JobPix server copy of your job
            history.
          </p>
          <p>
            When you ask JobPix to read your photos, those photos are sent to an AI service to draft
            the scope of work and suggested materials. They are used to produce that draft and are
            not added to your device's job history by anyone but you.
          </p>
          <p>
            If you email a problem report or feature idea, your message and a short note of your app
            version and device type are sent to {SUPPORT_EMAIL} through your own email app.
          </p>
          <p>
            Clearing your browser data, or uninstalling the app from your device, removes your jobs
            permanently. Keep printed or shared PDFs if you need a lasting record.
          </p>
        </div>
      </main>
    </div>
  );
}
