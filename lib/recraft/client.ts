/**
 * Recraft AI API client.
 *
 * API base: https://external.api.recraft.ai/v1
 * Auth:     Authorization: Bearer RECRAFT_API_TOKEN
 * Docs:     https://www.recraft.ai/docs/api-reference/endpoints
 *
 * This module handles:
 *   - Text-to-vector generation (model: recraftv4_vector)
 *   - Downloading the resulting SVG from the response URL
 *   - Rasterizing SVG → high-res PNG via Sharp (best-effort)
 */

import sharp from "sharp";

const RECRAFT_BASE = "https://external.api.recraft.ai/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecraftGenerateResult {
  /** Raw SVG text from Recraft */
  svgText: string;
  /** SVG as Buffer (for writing to disk) */
  svgBuffer: Buffer;
  /** High-res PNG rasterization, null if rasterization failed */
  pngBuffer: Buffer | null;
}

interface RecraftApiResponse {
  data: Array<{ url: string; b64_json?: string }>;
}

// ── Rasterizer ────────────────────────────────────────────────────────────────

async function rasterizeSvg(svgBuffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(svgBuffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: false })
      .png({ compressionLevel: 8 })
      .toBuffer();
  } catch (err) {
    // SVG rasterization requires librsvg; silently degrade if unavailable
    console.warn("[recraft] SVG rasterization skipped:", (err as Error).message);
    return null;
  }
}

// ── Core API call ─────────────────────────────────────────────────────────────

async function callRecraftGenerate(prompt: string): Promise<string> {
  const token = process.env.RECRAFT_API_TOKEN;
  if (!token) {
    throw new Error("RECRAFT_API_TOKEN is not configured");
  }

  const body = {
    prompt,
    model:           "recraftv4_vector",
    style:           "vector_illustration",
    n:               1,
    size:            "1024x1024",
    response_format: "url",
  };

  const res = await fetch(`${RECRAFT_BASE}/images/generations`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`Recraft API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as RecraftApiResponse;
  const imageUrl = json?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Recraft returned no image URL in response");
  }

  return imageUrl;
}

// ── Download result ───────────────────────────────────────────────────────────

async function downloadResult(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download Recraft result (${res.status}): ${url}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates a flat-sketch vector image using the Recraft API.
 * Returns SVG text, SVG buffer, and an optional PNG rasterization.
 */
export async function generateVectorSketch(
  prompt: string,
): Promise<RecraftGenerateResult> {
  const imageUrl  = await callRecraftGenerate(prompt);
  const rawBuffer = await downloadResult(imageUrl);

  // Determine if the result is SVG (recraftv4_vector returns SVG)
  const head = rawBuffer.subarray(0, 512).toString("utf-8").toLowerCase();
  const isSvg = head.includes("<svg") || imageUrl.endsWith(".svg");

  let svgBuffer: Buffer;
  let svgText: string;

  if (isSvg || head.includes("<svg")) {
    svgBuffer = rawBuffer;
    svgText   = rawBuffer.toString("utf-8");
  } else {
    // Recraft returned a raster — wrap with a placeholder SVG note
    // and attempt to vectorize (fall-through; Phase 3 still stores the raw PNG)
    console.warn("[recraft] Response was not SVG; storing raw buffer as fallback");
    svgBuffer = rawBuffer;
    svgText   = rawBuffer.toString("utf-8");
  }

  const pngBuffer = await rasterizeSvg(svgBuffer);

  return { svgText, svgBuffer, pngBuffer };
}
