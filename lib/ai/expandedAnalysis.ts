import OpenAI from "openai";
import {
  type GarmentCategory,
  type GarmentParams,
  type GarmentFeatures,
  type ExpandedAnalysis,
  type SubType,
  type FitType,
  GARMENT_CATEGORIES,
  VisionParsingError,
} from "./types";

const MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const MAX_RETRIES = 2;

// Lazy client — avoids module-level throw when OPENAI_API_KEY is not yet set
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional fashion tech-pack analyst specializing in streetwear and athleisure garments.

Analyze the provided garment image and return ONLY valid JSON — no markdown fences, no prose, no explanation.

Return this exact structure:
{
  "category": "hoodie" | "sweatshirt" | "sweatpants",
  "sub_type": "oversized_hoodie" | "pullover_hoodie" | "zip_hoodie" | "unisex_hoodie" | "crewneck" | "sweatpants",
  "fit": "oversized" | "regular" | "slim",
  "params": {
    "bodyWidth": <0-1>,
    "bodyLength": <0-1>,
    "shoulderWidth": <0-1>,
    "sleeveLength": <0-1>,
    "sleeveWidth": <0-1>,
    "hoodWidth": <0-1, hoodie only>,
    "hoodHeight": <0-1, hoodie only>,
    "pocketTopY": <0-1, hoodie only>,
    "legWidth": <0-1, sweatpants only>,
    "inseam": <0-1, sweatpants only>,
    "rise": <0-1, sweatpants only>
  },
  "features": {
    "zip": <boolean>,
    "kangarooPocket": <boolean>,
    "drawcord": <boolean>,
    "ribHem": <boolean>,
    "ribCuff": <boolean>
  },
  "material": {
    "primary": <fabric name, e.g. "French Terry" | "Fleece" | "Jersey">,
    "weight_estimate": <e.g. "280 GSM" | "300 GSM" | "unknown">,
    "composition_guess": <e.g. "80% Cotton / 20% Polyester">
  },
  "color": {
    "primary_hex": <6-digit hex, e.g. "#4B5D52">,
    "primary_name": <descriptive color name, e.g. "Forest Green">,
    "accent_hex": <6-digit hex if there is a distinct accent color, otherwise omit>
  },
  "construction": {
    "shoulder_type": "drop" | "set-in" | "raglan",
    "sleeve_style": "regular" | "balloon" | "tapered",
    "seam_type": "flatlock" | "overlock" | "coverstitch",
    "hem_style": "rib" | "raw" | "folded" | "elastic",
    "cuff_style": "rib" | "raw" | "elastic" | "open"
  },
  "branding": {
    "position": <e.g. "left chest" | "center chest" | "back">,
    "type": <e.g. "embroidered logo" | "screen print" | "patch">,
    "description": <brief description of the branding>
  },
  "confidence": <0-1>
}

Rules:
- Omit "branding" key entirely if no visible branding/logo is present.
- Omit category-irrelevant param keys (e.g. no hood keys for sweatpants).
- All ratio params are relative to garment bounding box (0 = min, 1 = max).
- sub_type must match category: hoodies→{oversized_hoodie,pullover_hoodie,zip_hoodie,unisex_hoodie}; sweatshirt→crewneck; sweatpants→sweatpants.
- Use "zip_hoodie" if a visible full-length zipper is present at the center front.
- Use "oversized_hoodie" for hoods without kangaroo pocket, oversized silhouette.
- Use "pullover_hoodie" for standard kangaroo pocket hoodies.
- Estimate colors from what is visible; provide best-guess hex.
- If the image is a flat sketch (black outlines, no color fill), set primary_hex to "#FFFFFF" and primary_name to "White (flat sketch)".
- If confidence < 0.5, still return best guesses but set confidence accordingly.`;

// ── Validation helpers ────────────────────────────────────────────────────────

function clamp01(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0.5 : Math.max(0, Math.min(1, n));
}

function clampParams(raw: Record<string, unknown>): GarmentParams {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = clamp01(v);
  }
  return out as unknown as GarmentParams;
}

const VALID_FITS = new Set<FitType>(["oversized", "regular", "slim"]);
const VALID_SUB_TYPES = new Set<SubType>([
  "oversized_hoodie", "pullover_hoodie", "zip_hoodie", "unisex_hoodie",
  "crewneck", "sweatpants",
]);
const VALID_SHOULDER = new Set(["drop", "set-in", "raglan"]);
const VALID_SLEEVE   = new Set(["regular", "balloon", "tapered"]);
const VALID_SEAM     = new Set(["flatlock", "overlock", "coverstitch"]);
const VALID_HEM      = new Set(["rib", "raw", "folded", "elastic"]);
const VALID_CUFF     = new Set(["rib", "raw", "elastic", "open"]);

function safeStr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function parseJSON(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

function validateExpanded(raw: unknown, categoryHint?: GarmentCategory): ExpandedAnalysis {
  if (typeof raw !== "object" || raw === null) {
    throw new VisionParsingError("Response is not an object");
  }
  const obj = raw as Record<string, unknown>;

  // category
  const cat = String(obj.category ?? "").toLowerCase() as GarmentCategory;
  if (!GARMENT_CATEGORIES.includes(cat)) {
    throw new VisionParsingError(`Invalid category: ${cat}`);
  }

  // sub_type
  let sub = String(obj.sub_type ?? "").toLowerCase() as SubType;
  if (!VALID_SUB_TYPES.has(sub)) {
    // Derive a sane default
    sub = cat === "sweatshirt" ? "crewneck"
        : cat === "sweatpants" ? "sweatpants"
        : "pullover_hoodie";
  }

  // fit
  let fit = String(obj.fit ?? "regular").toLowerCase() as FitType;
  if (!VALID_FITS.has(fit)) fit = "regular";

  // params
  const rawParams = (typeof obj.params === "object" && obj.params !== null)
    ? obj.params as Record<string, unknown>
    : {};

  // features
  const rawFeatures = (typeof obj.features === "object" && obj.features !== null)
    ? obj.features as Record<string, unknown>
    : {};
  const features: GarmentFeatures = {
    zip:            Boolean(rawFeatures.zip),
    kangarooPocket: Boolean(rawFeatures.kangarooPocket),
    drawcord:       Boolean(rawFeatures.drawcord),
    ribHem:         Boolean(rawFeatures.ribHem),
    ribCuff:        Boolean(rawFeatures.ribCuff),
  };

  // material
  const mat = (typeof obj.material === "object" && obj.material !== null)
    ? obj.material as Record<string, unknown>
    : {};
  const material = {
    primary:           safeStr(mat.primary,           "French Terry"),
    weight_estimate:   safeStr(mat.weight_estimate,   "unknown"),
    composition_guess: safeStr(mat.composition_guess, "80% Cotton / 20% Polyester"),
  };

  // color
  const col = (typeof obj.color === "object" && obj.color !== null)
    ? obj.color as Record<string, unknown>
    : {};
  const hexRe = /^#[0-9A-Fa-f]{6}$/;
  const primaryHex = hexRe.test(String(col.primary_hex ?? "")) ? String(col.primary_hex) : "#808080";
  const color = {
    primary_hex:  primaryHex,
    primary_name: safeStr(col.primary_name, "Gray"),
    ...(hexRe.test(String(col.accent_hex ?? "")) ? { accent_hex: String(col.accent_hex) } : {}),
  };

  // construction
  const con = (typeof obj.construction === "object" && obj.construction !== null)
    ? obj.construction as Record<string, unknown>
    : {};
  const construction = {
    shoulder_type: VALID_SHOULDER.has(String(con.shoulder_type)) ? String(con.shoulder_type) as "drop" | "set-in" | "raglan" : "set-in",
    sleeve_style:  VALID_SLEEVE.has(String(con.sleeve_style))   ? String(con.sleeve_style)   as "regular" | "balloon" | "tapered" : "regular",
    seam_type:     VALID_SEAM.has(String(con.seam_type))        ? String(con.seam_type)        as "flatlock" | "overlock" | "coverstitch" : "overlock",
    hem_style:     VALID_HEM.has(String(con.hem_style))         ? String(con.hem_style)         as "rib" | "raw" | "folded" | "elastic" : "rib",
    cuff_style:    VALID_CUFF.has(String(con.cuff_style))       ? String(con.cuff_style)        as "rib" | "raw" | "elastic" | "open" : "rib",
  };

  // branding (optional)
  let branding: ExpandedAnalysis["branding"];
  if (typeof obj.branding === "object" && obj.branding !== null) {
    const br = obj.branding as Record<string, unknown>;
    if (br.position || br.type || br.description) {
      branding = {
        position:    safeStr(br.position,    ""),
        type:        safeStr(br.type,        ""),
        description: safeStr(br.description, ""),
      };
    }
  }

  return {
    category: categoryHint ?? cat,
    sub_type: sub,
    fit,
    params: clampParams(rawParams),
    features,
    material,
    color,
    construction,
    ...(branding ? { branding } : {}),
    confidence: clamp01(obj.confidence),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeGarmentExpanded({
  imageBuffer,
  mimeType,
  categoryHint,
}: {
  imageBuffer: Buffer;
  mimeType: string;
  categoryHint?: GarmentCategory;
}): Promise<ExpandedAnalysis> {
  const base64  = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const userText = categoryHint
    ? `Analyze this ${categoryHint} garment image. Return JSON only.`
    : `Analyze this garment image. Allowed categories: hoodie, sweatshirt, sweatpants. Return JSON only.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model:      MODEL,
        max_tokens: 1200,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text",      text: userText },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new VisionParsingError("Empty response from model");

      const parsed = parseJSON(text);
      return validateExpanded(parsed, categoryHint);
    } catch (err) {
      lastError = err as Error;
      if (err instanceof VisionParsingError) throw err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new VisionParsingError("Unknown error after retries");
}
