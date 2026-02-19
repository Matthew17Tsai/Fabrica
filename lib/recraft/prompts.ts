/**
 * Flat-sketch prompt builder for the Recraft vector generation API.
 *
 * Constructs detailed technical-drawing prompts from detected garment attributes
 * so that the generated SVG matches the designer's inspiration image as closely
 * as possible without being just a copy of the photo.
 */

import type { SubType, FitType } from "@/lib/db";
import type { GarmentFeatures } from "@/lib/ai/types";

// ── Garment name map ──────────────────────────────────────────────────────────

const GARMENT_LABEL: Record<SubType, string> = {
  oversized_hoodie: "oversized pullover hoodie",
  pullover_hoodie:  "pullover hoodie with kangaroo pocket",
  zip_hoodie:       "full-zip hoodie",
  unisex_hoodie:    "unisex pullover hoodie",
  crewneck:         "crewneck sweatshirt",
  sweatpants:       "sweatpants",
};

// ── Front-view feature descriptors ───────────────────────────────────────────

function frontFeatures(subType: SubType, features: GarmentFeatures): string[] {
  const parts: string[] = [];

  if (features.zip || subType === "zip_hoodie") {
    parts.push("full-length center front zipper with zipper pull");
  }
  if (features.kangarooPocket || subType === "pullover_hoodie") {
    parts.push("kangaroo pocket across front");
  }
  if (features.drawcord) {
    parts.push("hood drawcord with grommets");
  }
  if (features.ribCuff !== false) {
    parts.push("1x1 rib cuffs at wrists");
  }
  if (features.ribHem !== false && subType !== "sweatpants") {
    parts.push("1x1 rib hem band");
  }

  // Sweatpants-specific
  if (subType === "sweatpants") {
    parts.push("side slash pockets", "elastic waistband with drawcord");
  }

  return parts;
}

// ── Back-view feature descriptors ────────────────────────────────────────────

function backFeatures(subType: SubType, features: GarmentFeatures): string[] {
  const parts: string[] = [];

  if (["oversized_hoodie", "pullover_hoodie", "zip_hoodie", "unisex_hoodie"].includes(subType)) {
    parts.push("two-panel hood with center back seam", "drop-shoulder sleeve attachment");
  }
  if (features.ribCuff !== false) {
    parts.push("1x1 rib cuffs at wrists");
  }
  if (features.ribHem !== false && subType !== "sweatpants") {
    parts.push("1x1 rib hem band");
  }
  if (subType === "sweatpants") {
    parts.push("back patch pockets", "inseam and outseam stitching", "rib ankle cuffs");
  }
  if (subType === "crewneck") {
    parts.push("clean back panel", "raglan-style seam details");
  }

  return parts;
}

// ── Shared construction details ───────────────────────────────────────────────

function constructionNotes(subType: SubType, view: "front" | "back"): string {
  const isTop   = subType !== "sweatpants";
  const isPants = subType === "sweatpants";

  if (isTop && view === "front") {
    return "visible side seam allowance, shoulder seam lines, armhole curve, and collar/neckline construction";
  }
  if (isTop && view === "back") {
    return "back yoke seam, center-back hood seam, sleeve attachment, and hem seam";
  }
  if (isPants && view === "front") {
    return "waistband stitching, crotch seam curve, inseam, and side seam";
  }
  return "back rise seam, seat curve, inseam, side seam, and ankle cuff";
}

// ── Main prompt builder ───────────────────────────────────────────────────────

export function buildFlatSketchPrompt(
  subType: SubType,
  fit: FitType,
  features: GarmentFeatures,
  view: "front" | "back",
): string {
  const garmentLabel = GARMENT_LABEL[subType] ?? "hoodie";
  const fitPrefix    = fit === "oversized" ? "oversized " : fit === "slim" ? "slim-fit " : "";

  const detailList =
    view === "front"
      ? frontFeatures(subType, features)
      : backFeatures(subType, features);

  const detailStr = detailList.length > 0 ? ` with ${detailList.join(", ")}` : "";

  const construction = constructionNotes(subType, view);

  // Negative descriptors to keep the output technical and clean
  const negatives = [
    "no shading",
    "no color fill",
    "no gradient",
    "no background",
    "no model",
    "no mannequin",
    "no 3D rendering",
    "no photorealism",
  ].join(", ");

  return (
    `Technical flat sketch of a ${fitPrefix}${garmentLabel}${detailStr}, ` +
    `${view} view, ` +
    `garment laid flat and symmetrical, straight hanging position, ` +
    `clean bold black vector outlines on solid white background, ` +
    `fashion industry technical drawing style, ` +
    `${construction}, ` +
    `showing seam lines and stitching details, rib texture at cuffs and hem, ` +
    negatives
  );
}

/**
 * Returns a short negative prompt string to pass as negative_prompt (if supported).
 */
export const FLAT_SKETCH_NEGATIVE =
  "shading, shadows, gradients, color fill, 3D, photorealism, human model, " +
  "mannequin, background elements, texture patterns, noise";
