import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const CATEGORIES = [
  "jobType",
  "visible",
  "work",
  "prep",
  "material",
  "measurement",
  "labour",
  "safety",
  "unknown",
  "question",
] as const;

const Input = z.object({
  photos: z.array(z.string()).min(1).max(8),
  model: z.literal("openai").default("openai"),
  hint: z.string().optional(),
  units: z.enum(["imperial", "metric"]).default("imperial"),
});

const Shape = z.object({
  jobType: z.string().default(""),
  confidence: z.enum(["low", "medium", "high"]).default("low"),
  items: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        text: z.string(),
        qty: z.coerce.number().nullable().default(null),
        unit: z.string().nullable().default(null),
        status: z.enum(["observed", "estimated", "unknown"]),
      }),
    )
    .default([]),
});

const system = (units: string) => `You are an experienced general contractor and estimator
reviewing job-site photos for a repair or renovation job. General contracting, handyman and
trades work only — never automotive or small-engine repair.

You do NOT set prices and you do NOT produce a customer quote. You produce an internal
working analysis that the contractor reviews and controls.

Cover, where the photos support it: job type, visible structures/surfaces/equipment, work
required, preparation required, materials, measurements with quantities, labour
considerations, safety and access considerations, unknowns, and questions the contractor
should confirm with the customer.

Tag every single finding honestly:
- "observed" — clearly visible in the photos.
- "estimated" — inferred or approximated (all measurements from photos are estimated).
- "unknown" — cannot be determined from the photos.

Use ${units} measurements. Put numeric amounts in "qty" with a short "unit" (e.g. "sq ft",
"linear ft", "each"), or null when there is no number.

Be concise. Each finding is a short phrase or one short sentence (aim under 15 words).
No narrative, no essays, no explaining obvious details, no repeating the contractor's notes.
One fact per finding; do not duplicate findings across categories.
Questions are short, practical questions to ask the customer or check on site.
Never include prices or costs.`;

const userText = (hint?: string) =>
  hint?.trim()
    ? `Analyse every photo provided. Contractor job description / notes (context only, do not repeat): ${hint.trim()}`
    : "Analyse every photo provided.";

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["jobType", "confidence", "items"],
  properties: {
    jobType: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "text", "qty", "unit", "status"],
        properties: {
          category: { type: "string", enum: [...CATEGORIES] },
          text: { type: "string" },
          qty: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          status: { type: "string", enum: ["observed", "estimated", "unknown"] },
        },
      },
    },
  },
} as const;

function gatewayError(status: number, body: string): Error {
  if (status === 429) return new Error("AI is busy right now. Try again in a moment.");
  if (status === 402) return new Error("AI credits exhausted. Add credits to continue.");
  if (status === 403) return new Error("This AI model is not available for this project.");
  return new Error(`Photo analysis failed (${status}): ${body.slice(0, 300)}`);
}

/** OpenAI vision path — Responses API, streamed and consumed server-side. */
async function runOpenai(
  key: string,
  data: z.infer<typeof Input>,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: signal ?? null,
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      instructions: system(data.units),
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: { type: "json_schema", name: "job_analysis", strict: true, schema: jsonSchema },
      },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: userText(data.hint) },
            ...data.photos.map((url) => ({ type: "input_image", image_url: url })),
          ],
        },
      ],
    }),
  });

  if (!res.ok || !res.body) throw gatewayError(res.status, res.body ? await res.text() : "");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          out += event.delta;
        } else if (event.type === "response.completed" && event.response?.output_text) {
          if (!out) out = event.response.output_text;
        }
      } catch {
        /* ignore keep-alives and partial frames */
      }
    }
  }

  return out;
}

export const analyzePhotos = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    let signal: AbortSignal | undefined;
    try {
      signal = getRequest().signal;
    } catch {
      signal = undefined;
    }
    const text = await runOpenai(key, data, signal);
    const cleaned = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("The analysis came back unreadable. Try again.");
    }

    return Shape.parse(parsed);
  });
