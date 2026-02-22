/**
 * Gemini AI flat sketch generation.
 *
 * Generates front + back technical flat sketches from a garment photo.
 * Uses multi-turn generateContent (chat history) so the back view has context
 * from the front, ensuring visual consistency.
 *
 * Model: gemini-2.0-flash-exp-image-generation (image output support)
 * Falls back gracefully if the API key is missing or generation fails.
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import sharp from 'sharp';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp-image-generation';

const GARMENT_HINTS: Record<string, string> = {
  hoodie:     'pullover hoodie with hood and drawcord, kangaroo or split pockets, rib cuffs and hem',
  sweatshirt: 'crewneck sweatshirt with rib collar, cuffs, and hem',
  sweatpants: 'sweatpants with elastic waistband and drawcord, side pockets, tapered leg with rib ankle cuffs',
};

/**
 * Extract confirmed feature detail lines from ai_analysis_json.
 * Returns a bullet-list string using the `detected_features[].detail` descriptions.
 * Returns empty string if no detected_features in the JSON.
 */
function buildFeatureLines(aiAnalysisJson: string | null): string {
  if (!aiAnalysisJson) return '';
  try {
    const analysis = JSON.parse(aiAnalysisJson) as {
      detected_features?: Array<{ feature: string; detail: string }>;
    };
    const features = analysis.detected_features;
    if (!features || features.length === 0) return '';
    return features.map(f => `- ${f.detail || f.feature}`).join('\n');
  } catch {
    return '';
  }
}

/**
 * Build pocket-specific accuracy rules derived from the description and feature lines.
 * These are injected regardless of whether detected_features is available,
 * to prevent Gemini hallucinating wrong pocket types (e.g. kangaroo on sweatpants).
 */
function buildPocketRules(description: string, featureLines: string): string {
  const combined = (description + ' ' + featureLines).toLowerCase();
  const rules: string[] = [];

  const hasSideSeamPocket = combined.includes('side seam pocket') || combined.includes('side seam slit');
  const hasSidePocket     = combined.includes('side pocket') || combined.includes('side pockets');
  const hasKangaroo       = combined.includes('kangaroo');
  const hasPatch          = combined.includes('patch pocket');
  const hasBackPocket     = combined.includes('back pocket') || combined.includes('rear pocket');

  if ((hasSideSeamPocket || (hasSidePocket && !hasKangaroo))) {
    rules.push(
      'SIDE POCKETS = narrow vertical slit openings along the side seam of the leg or body only. ' +
      'Do NOT draw a kangaroo pouch, a patch pocket, or any pocket on the front panel center.',
    );
  }
  if (hasKangaroo) {
    rules.push('Draw a kangaroo/pouch pocket centered on the front lower panel.');
  }
  if (hasPatch && !hasKangaroo) {
    rules.push('Draw a patch pocket (flat rectangular fabric sewn on surface).');
  }
  if (!hasBackPocket) {
    rules.push('The back view must have NO pockets — do not add any patch, welt, or pouch to the back.');
  }

  return rules.length
    ? '\n\nPOCKET ACCURACY (follow exactly):\n' + rules.map(r => `- ${r}`).join('\n')
    : '';
}

function buildFrontPrompt(description: string, featureLines: string): string {
  const featuresSection = featureLines
    ? `\n\nConfirmed construction features — draw ALL of these, EXACTLY as described:\n${featureLines}`
    : '';

  const pocketRules = buildPocketRules(description, featureLines);

  const accuracyRules = `

CRITICAL ACCURACY RULES:
- ONLY draw features explicitly listed. Do NOT invent features not in the list.
- Do NOT add back pockets, back vents, or back details unless explicitly listed as back features.${pocketRules}`;

  return `Create a professional flat fashion technical sketch — front view — of ${description}.${featuresSection}${accuracyRules}

Requirements:
- Black linework on pure white background
- Heavy outer silhouette, thinner lines for seams and topstitching
- Show all construction details: seams, pockets, closures, zippers, stitching
- No shading, no model, no texture, no colour fill
- Flat lay perspective, symmetrical
- Tech pack style, clean and production-ready`;
}

function buildBackPrompt(description: string, featureLines: string): string {
  const pocketRules = buildPocketRules(description, featureLines);

  const backNote = `

IMPORTANT: The back view must ONLY show features visible from the back. Features on the front panel or side seams do NOT appear on the back sketch.${pocketRules}${
  featureLines
    ? `\n\nConfirmed features for reference:\n${featureLines}`
    : ''
}`;

  return `Now create the back view of the same garment with identical line weight and style.${backNote}

Requirements:
- Same line weight and style as the front view you just generated
- Show back construction: back panel, yoke seam — only add pockets or closures if explicitly listed as back features
- No shading, no model, no texture, no colour fill
- Flat lay perspective, symmetrical
- Tech pack style, clean and production-ready`;
}

function extractImage(
  candidates: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>,
): Buffer | null {
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }
  return null;
}

export interface SketchPair {
  front: Buffer;
  back:  Buffer;
}

/**
 * Generate front + back flat sketches using multi-turn generateContent.
 * The back view request includes the front view response in the conversation
 * history, giving Gemini visual context for consistency.
 *
 * @param photoPath      Path to the garment photo
 * @param description    Human-readable garment description for the prompt
 * @param aiAnalysisJson Optional AI analysis JSON with detected_features for prompt accuracy
 */
export async function generateSketchPair(
  photoPath: string,
  description: string,
  aiAnalysisJson?: string | null,
): Promise<SketchPair> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Normalize orientation via EXIF before sending to Gemini.
  // Mobile photos often have EXIF rotation; sharp.rotate() applies it so the
  // model sees the garment upright rather than sideways.
  const rawBytes    = fs.readFileSync(photoPath);
  const imageBytes  = await sharp(rawBytes).rotate().png().toBuffer();
  const base64Image = imageBytes.toString('base64');

  const featureLines = buildFeatureLines(aiAnalysisJson ?? null);
  const frontPrompt  = buildFrontPrompt(description, featureLines);
  const backPrompt   = buildBackPrompt(description, featureLines);

  // ── Turn 1: Front view ──────────────────────────────────────────────────────

  const frontResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: frontPrompt },
        ],
      },
    ],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const frontCandidates = frontResponse.candidates ?? [];
  const frontBuffer = extractImage(frontCandidates);
  if (!frontBuffer) throw new Error('No front sketch image returned from Gemini');

  // Capture the model response parts to use as conversation context for the back view
  const modelFrontParts = frontCandidates[0]?.content?.parts ?? [];

  // ── Turn 2: Back view (with front context in history) ───────────────────────

  const backResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      // Original user request + photo
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: frontPrompt },
        ],
      },
      // Model's front view response (provides visual context for back view)
      {
        role: 'model',
        parts: modelFrontParts,
      },
      // User follow-up: back view
      {
        role: 'user',
        parts: [{ text: backPrompt }],
      },
    ],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const backCandidates = backResponse.candidates ?? [];
  const backBuffer = extractImage(backCandidates);
  if (!backBuffer) throw new Error('No back sketch image returned from Gemini');

  return { front: frontBuffer, back: backBuffer };
}

/**
 * Build a human-readable garment description for the sketch prompt.
 * Uses AI analysis if available, falls back to category hint.
 */
export function buildGarmentDescription(
  category: string,
  aiAnalysisJson: string | null,
): string {
  if (aiAnalysisJson) {
    try {
      const analysis = JSON.parse(aiAnalysisJson) as {
        sub_type?: string;
        fit?: string;
        material?: { primary?: string; composition_guess?: string };
        construction?: { shoulder_type?: string; body_length?: string };
        features?: {
          zip?: boolean;
          kangarooPocket?: boolean;
          drawcord?: boolean;
          ribHem?: boolean;
          ribCuff?: boolean;
        };
      };

      const parts: string[] = [];

      if (analysis.fit && analysis.fit !== 'regular') parts.push(analysis.fit);
      if (analysis.sub_type) {
        parts.push(analysis.sub_type.replace(/_/g, ' '));
      } else {
        parts.push(category);
      }

      if (analysis.construction?.shoulder_type && analysis.construction.shoulder_type !== 'set-in') {
        parts.push(`${analysis.construction.shoulder_type} shoulders`);
      }
      if (analysis.construction?.body_length && analysis.construction.body_length !== 'regular') {
        parts.push(`${analysis.construction.body_length} length`);
      }
      if (analysis.material?.primary) {
        parts.push(`in ${analysis.material.primary}`);
        if (analysis.material.composition_guess) {
          parts.push(`(${analysis.material.composition_guess})`);
        }
      }

      const featureList: string[] = [];
      if (analysis.features?.zip) featureList.push('full-front zipper');
      if (analysis.features?.kangarooPocket) featureList.push('kangaroo pocket');
      if (analysis.features?.drawcord) featureList.push('hood drawcord');
      if (analysis.features?.ribHem) featureList.push('rib hem');
      if (analysis.features?.ribCuff) featureList.push('rib cuffs');
      if (featureList.length > 0) parts.push(`with ${featureList.join(', ')}`);

      if (parts.length > 0) return parts.join(', ');
    } catch { /* fall through */ }
  }
  return GARMENT_HINTS[category] ?? category;
}
