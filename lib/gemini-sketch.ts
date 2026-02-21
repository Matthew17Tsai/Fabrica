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

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp-image-generation';

const GARMENT_HINTS: Record<string, string> = {
  hoodie:     'pullover hoodie with hood and drawcord, kangaroo or split pockets, rib cuffs and hem',
  sweatshirt: 'crewneck sweatshirt with rib collar, cuffs, and hem',
  sweatpants: 'sweatpants with elastic waistband and drawcord, side pockets, tapered leg with rib ankle cuffs',
};

function buildFrontPrompt(description: string): string {
  return `Create a professional flat fashion technical sketch — front view — of ${description}.

Requirements:
- Black linework on pure white background
- Heavy outer silhouette, thinner lines for seams and topstitching
- Show all construction details: seams, pockets, closures, zippers, stitching
- No shading, no model, no texture, no colour fill
- Flat lay perspective, symmetrical
- Tech pack style, clean and production-ready`;
}

const BACK_PROMPT = `Now create the back view of the same garment with identical line weight and style.

Requirements:
- Same line weight and style as the front view you just generated
- Show back construction: back panel, yoke seam, back pockets, closures
- No shading, no model, no texture, no colour fill
- Flat lay perspective, symmetrical
- Tech pack style, clean and production-ready`;

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
 */
export async function generateSketchPair(
  photoPath: string,
  description: string,
): Promise<SketchPair> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageBytes  = fs.readFileSync(photoPath);
  const base64Image = imageBytes.toString('base64');

  // ── Turn 1: Front view ──────────────────────────────────────────────────────

  const frontResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: buildFrontPrompt(description) },
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
          { text: buildFrontPrompt(description) },
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
        parts: [{ text: BACK_PROMPT }],
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
