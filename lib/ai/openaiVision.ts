import OpenAI from "openai";
import {
  type GarmentCategory,
  type GarmentParams,
  type GarmentParamsResult,
  GARMENT_CATEGORIES,
  VisionParsingError,
} from "./types";

// ── Config ────────────────────────────────────────────────────────

const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const MAX_RETRIES = 2;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── System prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a garment flat-sketch extraction engine.
Given a photo of a single garment, return ONLY valid JSON (no markdown fences, no prose).
The JSON schema is:
{
  "category": "hoodie" | "sweatshirt" | "sweatpants",
  "view": "front",
  "params": {
    "bodyWidth": <0-1>,
    "bodyLength": <0-1>,
    "shoulderWidth": <0-1>,
    "sleeveLength": <0-1>,
    "sleeveWidth": <0-1>,
    "hoodWidth": <0-1 if hoodie>,
    "hoodHeight": <0-1 if hoodie>,
    "pocketTopY": <0-1 if hoodie>,
    "legWidth": <0-1 if sweatpants>,
    "inseam": <0-1 if sweatpants>,
    "rise": <0-1 if sweatpants>
  },
  "features": {
    "zip": <boolean>,
    "kangarooPocket": <boolean>,
    "drawcord": <boolean>,
    "ribHem": <boolean>,
    "ribCuff": <boolean>
  },
  "confidence": <0-1>
}
All ratio values are relative to the garment bounding box (0 = minimum, 1 = maximum).
Omit category-irrelevant param keys entirely.
If you cannot determine the garment type from the allowed set, set category to the closest match and confidence below 0.4.`;

// ── Helpers ───────────────────────────────────────────────────────

function clamp01(v: unknown): number {
  const n = Number(v);
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function clampParams(params: Record<string, unknown>): GarmentParams {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = clamp01(v);
  }
  return out as unknown as GarmentParams;
}

function validateResult(raw: unknown): GarmentParamsResult {
  if (typeof raw !== "object" || raw === null) {
    throw new VisionParsingError("Response is not an object");
  }
  const obj = raw as Record<string, unknown>;

  // category
  const cat = String(obj.category ?? "").toLowerCase();
  if (!GARMENT_CATEGORIES.includes(cat as GarmentCategory)) {
    throw new VisionParsingError(`Invalid category: ${cat}`);
  }

  // params
  if (typeof obj.params !== "object" || obj.params === null) {
    throw new VisionParsingError("Missing params object");
  }

  // features
  const features: Record<string, boolean> = {};
  if (typeof obj.features === "object" && obj.features !== null) {
    for (const [k, v] of Object.entries(obj.features as Record<string, unknown>)) {
      features[k] = Boolean(v);
    }
  }

  return {
    category: cat as GarmentCategory,
    view: "front",
    params: clampParams(obj.params as Record<string, unknown>),
    features,
    confidence: clamp01(obj.confidence),
  };
}

function parseJSON(text: string): unknown {
  // Strip markdown fences if model misbehaves
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

// ── Main export ───────────────────────────────────────────────────

export async function extractGarmentParamsFromImage({
  imageBuffer,
  mimeType,
  categoryHint,
}: {
  imageBuffer: Buffer;
  mimeType: string;
  categoryHint?: GarmentCategory;
}): Promise<GarmentParamsResult> {
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const userContent = categoryHint
    ? `Analyze this garment photo. Expected category: ${categoryHint}. Return JSON only.`
    : `Analyze this garment photo. Allowed categories: hoodie, sweatshirt, sweatpants. Return JSON only.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        max_tokens: 800,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userContent },
              { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new VisionParsingError("Empty response from model");

      const parsed = parseJSON(text);
      return validateResult(parsed);
    } catch (err) {
      lastError = err as Error;
      // Only retry on transient / rate-limit errors
      if (err instanceof VisionParsingError) throw err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new VisionParsingError("Unknown error after retries");
}
