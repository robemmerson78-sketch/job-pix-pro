import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  photos: z.array(z.string()).max(6),
  notes: z.string().max(8000).optional(),
  scope: z.string().max(8000).optional(),
  materials: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number(),
        price: z.number(),
        owner: z.enum(["contractor", "ai"]),
        excluded: z.boolean().optional(),
      }),
    )
    .max(60)
    .optional(),
  /** Questions already answered or skipped, with whether the job changed since. */
  resolved: z
    .array(z.object({ q: z.string(), a: z.string(), changedSince: z.boolean() }))
    .max(30)
    .optional(),
});

const SYSTEM = `You help a general contractor / handyman before an AI scope and materials draft.
Look at the photos, the contractor's notes, the current scope and the current material lines.
Ask ONLY questions whose answer would materially change the work, the materials, the quantities
or the price. Examples: does the contractor already have a material (charge it or exclude it)?
an uncertain measurement; is a suggested item really required; an AI price that conflicts with
a contractor-entered price.

Rules:
- 0 to 5 questions. Straightforward jobs get 0. Never pad.
- Each question is one short sentence a contractor can answer in a few words.
- Do not re-ask a question that was already answered or skipped unless "changedSince" is true
  and the change matters.
- Do not ask about pricing preferences, scheduling, or anything that would not change the estimate.

Return STRICT JSON only: {"questions": ["...", "..."]}`;

export const askClarifications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const parts = [
      `Contractor notes:\n${data.notes?.trim() || "(none)"}`,
      `Current scope:\n${data.scope?.trim() || "(none yet)"}`,
      `Current material lines (JSON):\n${JSON.stringify(data.materials ?? [])}`,
      `Already answered / skipped (JSON):\n${JSON.stringify(data.resolved ?? [])}`,
    ];
    const content: Array<Record<string, unknown>> = [
      { type: "text", text: parts.join("\n\n") },
      ...data.photos.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned unreadable questions. Try again.");
    }
    const { questions } = z
      .object({ questions: z.array(z.string()).default([]) })
      .parse(parsed);
    return { questions: questions.map((q) => q.trim()).filter(Boolean).slice(0, 5) };
  });
