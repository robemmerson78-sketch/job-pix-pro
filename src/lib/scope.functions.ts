import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  photos: z.array(z.string()).min(1).max(6),
  hint: z.string().optional(),
});

const SYSTEM = `You are an experienced general contractor / handyman estimator.
Look at the job-site photos and draft a FIRST-PASS scope of work for a repair or
renovation quote. General contracting, handyman and trades work only — never
automotive or small-engine repair.

Return STRICT JSON only, matching:
{
  "description": "2-4 sentence plain-language description of what is damaged or needed",
  "tasks": ["short task line", "..."],
  "materials": [{"name": "material or supply item", "qty": 1, "price": 0}]
}
Rules: 3-8 tasks. 3-10 materials with realistic rough quantities. "price" is a
rough US/CA retail guess per unit in dollars (a number, 0 if unsure). Be concrete
about sizes/specs so the item can be searched at a hardware store.

Contractor notes vs photos:
- The contractor's notes are instructions. Include work and materials they ask for even
  when not visible in the photos (e.g. a new vanity or mirror).
- Never say something is visible or "shown" if it only comes from the notes.
- Use the photos for existing conditions; do not contradict the notes.
Keep it concise: short task lines, no essay, no repeating the notes back.`;

export const draftScope = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: data.hint?.trim()
          ? `Contractor job description / notes (instructions, may include work not visible in the photos):\n${data.hint.trim()}`
          : "Draft the scope of work from these photos.",
      },
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
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned an unreadable draft. Try again.");
    }

    const Shape = z.object({
      description: z.string().default(""),
      tasks: z.array(z.string()).default([]),
      materials: z
        .array(
          z.object({
            name: z.string(),
            qty: z.coerce.number().default(1),
            price: z.coerce.number().default(0),
          }),
        )
        .default([]),
    });

    return Shape.parse(parsed);
  });
