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

Analyze the provided garment image(s) carefully and return ONLY valid JSON — no markdown fences, no prose, no explanation.

CRITICAL: Answer every field based ONLY on what is VISUALLY CONFIRMED in the image. Do not assume typical defaults. If you cannot clearly see a feature, set it to false or the most minimal option.

Return this exact structure:
{
  "category": "hoodie" | "sweatshirt" | "sweatpants",
  "sub_type": "oversized_hoodie" | "pullover_hoodie" | "zip_hoodie" | "unisex_hoodie" | "crewneck" | "sweatpants",
  "fit": "oversized" | "regular" | "slim",
  "params": {
    "bodyWidth": <0-1, relative garment width>,
    "bodyLength": <0-1, relative garment length>,
    "shoulderWidth": <0-1>,
    "sleeveLength": <0-1>,
    "sleeveWidth": <0-1>,
    "hoodWidth": <0-1, hoodie only — omit for sweatshirt/sweatpants>,
    "hoodHeight": <0-1, hoodie only — omit for sweatshirt/sweatpants>,
    "pocketTopY": <0-1, hoodie only — omit for sweatshirt/sweatpants>,
    "legWidth": <0-1, sweatpants only>,
    "inseam": <0-1, sweatpants only>,
    "rise": <0-1, sweatpants only>
  },
  "features": {
    "zip": <VISUAL CHECK: Is there a full-length front zipper clearly visible? true/false>,
    "kangarooPocket": <VISUAL CHECK: Is there any visible front pocket? true/false>,
    "drawcord": <VISUAL CHECK: Is there an actual cord or string visibly exiting the hood tunnel? ONLY true if you can see the cord itself. A plain hood with no visible cord = false>,
    "ribHem": <VISUAL CHECK: Is there a distinct ribbed band at the bottom hem? true/false>,
    "ribCuff": <VISUAL CHECK: Are there distinct ribbed bands at the wrists? true/false>,
    "zipperPullType": <Only when zip=true. "metal_tab" = simple flat metal piece. "loop_pull" = fabric loop or ring-style pull. Set "none" if zip=false>,
    "pocketType": <Only when kangarooPocket=true. "split_kangaroo" = two separate pockets, one each side (common on zip hoodies). "continuous_kangaroo" = single wide pocket spanning full width. Set "none" if no pocket>
  },
  "material": {
    "primary": <e.g. "French Terry" | "Fleece" | "Jersey" | "Nylon" | "Cotton Twill">,
    "weight_estimate": <e.g. "280 GSM" | "300 GSM" | "unknown">,
    "composition_guess": <e.g. "80% Cotton / 20% Polyester">
  },
  "color": {
    "primary_hex": <6-digit hex, e.g. "#4B5D52">,
    "primary_name": <descriptive color name, e.g. "Forest Green">,
    "accent_hex": <6-digit hex only if a DISTINCT accent color is visible, otherwise omit>
  },
  "construction": {
    "shoulder_type": "drop" | "set-in" | "raglan",
    "sleeve_style": <"regular" for normal width, "balloon" ONLY if sleeve width is dramatically wide/exaggerated, "tapered" if narrowing toward wrist>,
    "seam_type": "flatlock" | "overlock" | "coverstitch",
    "hem_style": "rib" | "raw" | "folded" | "elastic",
    "cuff_style": "rib" | "raw" | "elastic" | "open",
    "shoulder_drop": <"none" if sleeve attaches at the natural shoulder bone, "slight" if it drops 1-3 cm past shoulder, "exaggerated" if it drops 4+ cm dramatically past shoulder>,
    "body_length": <"cropped" if hem ends above the hip bone, "regular" if hem is at hip level, "longline" if hem falls to mid-thigh or below>
  },
  "branding": {
    "position": <e.g. "left chest" | "center chest" | "back">,
    "type": <e.g. "embroidered logo" | "screen print" | "patch" | "woven label">,
    "description": <brief description>
  },
  "proportions": {
    "silhouette": <"A-line" if garment widens toward hem, "rectangular" if straight boxy sides, "trapezoid" if narrowing toward hem>,
    "widthToLength": <"wider_than_tall" if garment width exceeds its length, "square" if roughly equal, "taller_than_wide" if length clearly exceeds width>,
    "hoodSize": <"small" if hood is compact, "standard" for typical size, "large" if hood is notably oversized relative to body — hoodie only, omit for others>,
    "pocketWidth": <"narrow" if pocket spans less than 40% body width, "medium" for 40-60%, "wide" for more than 60% — only if kangarooPocket=true>,
    "shoulderVsHem": <"shoulders_narrower" if hem is wider than shoulder, "same_width", or "shoulders_wider" if shoulders extend past hem>
  },
  "confidence": <0-1>
}

Detection rules — read carefully:
- "zip_hoodie": ONLY if a full-length center-front zipper is CLEARLY visible. When in doubt, use "pullover_hoodie".
- "drawcord": This is the most commonly mis-detected feature. ONLY set true if you can see an actual cord/string exiting the hood. A clean hood with no cord = false. Most oversized hoodies and many zip hoodies have NO drawcord.
- "zipperPullType": When in doubt between metal_tab and loop_pull — look at the zipper top. A thin flat metal rectangle = "metal_tab". A fabric loop, ring, or oversized decorative pull = "loop_pull". Default to "metal_tab" if unclear.
- "pocketType": If zip=true and pockets are present, they are almost always "split_kangaroo" (one pocket each side of the zipper). "continuous_kangaroo" is a single unbroken pouch on pullover hoodies.
- "sleeve_style": Only use "balloon" for dramatically wide sleeves clearly wider than the body. Regular streetwear sleeves = "regular".
- "shoulder_drop": Only use "exaggerated" for deliberate drop-shoulder designs where the seam visibly hangs below the shoulder. Regular streetwear = "slight" or "none".
- "body_length": Compare hem position to natural waist/hip. Cropped = above hip, regular = at hip, longline = well below hip.
- "proportions.silhouette": Look at the side edges of the garment body. "A-line" widens toward hem. "rectangular" has parallel sides (boxy). "trapezoid" narrows toward hem.
- "proportions.hoodSize": Compare the hood height to the body length. Large hood = hood height is more than 30% of total garment length. Only fill for hoodies.
- "proportions.pocketWidth": Compare kangaroo pocket width to total body width. If pocket is narrow (<40% wide), set "narrow". If it spans most of the front, set "wide".
- Omit "branding" key entirely if no visible branding/logo.
- Omit category-irrelevant param keys (no hood params for sweatpants, no leg params for tops).
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
const VALID_SHOULDER      = new Set(["drop", "set-in", "raglan"]);
const VALID_SLEEVE        = new Set(["regular", "balloon", "tapered"]);
const VALID_SEAM          = new Set(["flatlock", "overlock", "coverstitch"]);
const VALID_HEM           = new Set(["rib", "raw", "folded", "elastic"]);
const VALID_CUFF          = new Set(["rib", "raw", "elastic", "open"]);
const VALID_SHOULDER_DROP = new Set(["none", "slight", "exaggerated"]);
const VALID_BODY_LENGTH   = new Set(["cropped", "regular", "longline"]);
const VALID_ZIPPER_PULL   = new Set(["metal_tab", "loop_pull", "none"]);
const VALID_POCKET_TYPE   = new Set(["split_kangaroo", "continuous_kangaroo", "none"]);

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
  const hasZip     = Boolean(rawFeatures.zip);
  const hasPocket  = Boolean(rawFeatures.kangarooPocket);
  const rawPullStr = String(rawFeatures.zipperPullType ?? "");
  const rawPockStr = String(rawFeatures.pocketType ?? "");
  const features: GarmentFeatures = {
    zip:            hasZip,
    kangarooPocket: hasPocket,
    drawcord:       Boolean(rawFeatures.drawcord),
    ribHem:         Boolean(rawFeatures.ribHem),
    ribCuff:        Boolean(rawFeatures.ribCuff),
    zipperPullType: VALID_ZIPPER_PULL.has(rawPullStr)
      ? rawPullStr as "metal_tab" | "loop_pull" | "none"
      : hasZip ? "metal_tab" : "none",
    pocketType: VALID_POCKET_TYPE.has(rawPockStr)
      ? rawPockStr as "split_kangaroo" | "continuous_kangaroo" | "none"
      : hasPocket ? "continuous_kangaroo" : "none",
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
    sleeve_style:  VALID_SLEEVE.has(String(con.sleeve_style))    ? String(con.sleeve_style)   as "regular" | "balloon" | "tapered" : "regular",
    seam_type:     VALID_SEAM.has(String(con.seam_type))         ? String(con.seam_type)       as "flatlock" | "overlock" | "coverstitch" : "overlock",
    hem_style:     VALID_HEM.has(String(con.hem_style))          ? String(con.hem_style)        as "rib" | "raw" | "folded" | "elastic" : "rib",
    cuff_style:    VALID_CUFF.has(String(con.cuff_style))        ? String(con.cuff_style)       as "rib" | "raw" | "elastic" | "open" : "rib",
    shoulder_drop: VALID_SHOULDER_DROP.has(String(con.shoulder_drop))
      ? String(con.shoulder_drop) as "none" | "slight" | "exaggerated"
      : "none",
    body_length:   VALID_BODY_LENGTH.has(String(con.body_length))
      ? String(con.body_length) as "cropped" | "regular" | "longline"
      : "regular",
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

  // proportions (optional — only present if AI returned it)
  const VALID_SILHOUETTE    = new Set(["A-line", "rectangular", "trapezoid"]);
  const VALID_WIDTH_LENGTH  = new Set(["wider_than_tall", "square", "taller_than_wide"]);
  const VALID_HOOD_SIZE     = new Set(["small", "standard", "large"]);
  const VALID_POCKET_WIDTH  = new Set(["narrow", "medium", "wide"]);
  const VALID_SHOULDER_HEM  = new Set(["shoulders_narrower", "same_width", "shoulders_wider"]);
  let proportions: ExpandedAnalysis["proportions"];
  if (typeof obj.proportions === "object" && obj.proportions !== null) {
    const pr = obj.proportions as Record<string, unknown>;
    proportions = {};
    if (VALID_SILHOUETTE.has(String(pr.silhouette)))   proportions.silhouette   = String(pr.silhouette)   as "A-line" | "rectangular" | "trapezoid";
    if (VALID_WIDTH_LENGTH.has(String(pr.widthToLength))) proportions.widthToLength = String(pr.widthToLength) as "wider_than_tall" | "square" | "taller_than_wide";
    if (VALID_HOOD_SIZE.has(String(pr.hoodSize)))      proportions.hoodSize     = String(pr.hoodSize)     as "small" | "standard" | "large";
    if (VALID_POCKET_WIDTH.has(String(pr.pocketWidth))) proportions.pocketWidth  = String(pr.pocketWidth)  as "narrow" | "medium" | "wide";
    if (VALID_SHOULDER_HEM.has(String(pr.shoulderVsHem))) proportions.shoulderVsHem = String(pr.shoulderVsHem) as "shoulders_narrower" | "same_width" | "shoulders_wider";
    // Only include if at least one field was set
    if (Object.keys(proportions).length === 0) proportions = undefined;
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
    ...(proportions ? { proportions } : {}),
    confidence: clamp01(obj.confidence),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeGarmentExpanded({
  imageBuffer,
  mimeType,
  additionalImages,
  categoryHint,
}: {
  imageBuffer: Buffer;
  mimeType: string;
  additionalImages?: Array<{ buffer: Buffer; mimeType: string }>;
  categoryHint?: GarmentCategory;
}): Promise<ExpandedAnalysis> {
  const base64  = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const totalImages = 1 + (additionalImages?.length ?? 0);
  const userText = totalImages > 1
    ? `I'm providing ${totalImages} images of the same garment from different angles. Analyze ALL images together for the most accurate description. ${categoryHint ? `Expected category: ${categoryHint}. ` : "Allowed categories: hoodie, sweatshirt, sweatpants. "}Return JSON only.`
    : categoryHint
      ? `Analyze this ${categoryHint} garment image. Return JSON only.`
      : `Analyze this garment image. Allowed categories: hoodie, sweatshirt, sweatpants. Return JSON only.`;

  const imageContent = [
    { type: "image_url" as const, image_url: { url: dataUrl, detail: "high" as const } },
    ...(additionalImages ?? []).map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.buffer.toString("base64")}`,
        detail: "high" as const,
      },
    })),
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model:      MODEL,
        max_tokens: 1500,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              ...imageContent,
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
