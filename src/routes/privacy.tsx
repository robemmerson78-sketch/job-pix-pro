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
          "How JobPix handles your information: what stays on your device, what is sent for AI processing, and your controls.",
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
        <p className="mt-1 text-xs text-muted-foreground">Last updated: November 2026</p>
        <div className="mt-4 space-y-5 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">What stays on your device</h2>
            <p>
              Your jobs, photos, notes, prices, business profile, logo, quote defaults and
              preferences are saved only in this browser's storage on this device. There is no
              JobPix account and no JobPix server copy of your jobs. Backup files you export are
              saved wherever you choose.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">What is sent for AI processing</h2>
            <p>Only when you tap an AI button, JobPix sends the following from that job:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Draft scope from photos:</strong> up to the first 4 job photos; your
                contractor job description / notes; your measurement units and supplier name; your
                current material lines (names, quantities, prices, whether you wrote or excluded
                them); and your answers to clarification questions.
              </li>
              <li>
                <strong>Check for questions:</strong> up to the first 4 job photos; your notes; the
                current scope of work; your current material lines and prices; and earlier questions
                with your answers.
              </li>
            </ul>
            <p>
              Your client's name and address, your business profile and logo, labour, tax and quote
              notes are not included in these AI requests.
            </p>
            <p>
              These requests go through our server to the Lovable AI Gateway, which passes them to
              the AI model provider: Google (Gemini) for scope drafts and OpenAI for clarification
              questions. The AI's answer is returned to your device; JobPix does not keep a copy on
              its server. How long the AI service and model providers keep request data is set by
              their own terms, not by JobPix.
            </p>
            <p>
              To protect against misuse, the server checks the size of each AI request and applies
              temporary usage limits based on your connection. Your connection's IP address is used
              only for that and is not stored by JobPix.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">Site analytics and services</h2>
            <p>
              The published app uses Lovable's visitor analytics. It uses no cookies, stores nothing
              on your device, doesn't keep IP addresses and doesn't identify you. It records the
              pages visited, where visitors came from, their country, browser, operating system and
              device type, how long they stay, how fast pages load, errors, and which buttons and
              links are clicked. Detailed data is kept for 90 days and daily summaries for a year.
              This is recorded for every visitor. Lovable collects this data for us.{" "}
              <a
                className="underline"
                href="https://lovable.dev/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lovable's privacy policy
              </a>{" "}
              explains how it handles it.
            </p>
            <p>
              If the app hits an error, a technical error report (no job content) is sent to Lovable
              so it can be fixed. The app's text font is loaded from Google Fonts, which receives
              your browser's usual request details.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">Email support</h2>
            <p>
              If you email a problem report, feature idea or question, your message and a short note
              of your app version, the screen you were on and your device type are sent to{" "}
              {SUPPORT_EMAIL} through your own email app.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">Your controls</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Nothing is sent to AI unless you tap an AI button.</li>
              <li>Delete photos or whole jobs at any time; they are removed from this device.</li>
              <li>
                "Don't keep" in Settings removes the extra sharper photo copies saved on this
                device.
              </li>
              <li>Export a backup or restore one from Settings.</li>
              <li>
                Clearing your browser data, or uninstalling the app, permanently removes your jobs
                from this device unless you have a backup.
              </li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-primary">Contact</h2>
            <p>Questions about privacy: {SUPPORT_EMAIL}.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
