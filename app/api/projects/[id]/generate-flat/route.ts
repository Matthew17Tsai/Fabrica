/**
 * POST /api/projects/[id]/generate-flat
 *
 * Triggers Recraft vector flat-sketch generation for a project.
 * Generates front view, back view, or both (default: both) as separate API calls.
 *
 * Body (all optional):
 * {
 *   view?: 'front' | 'back' | 'both';  // default 'both'
 * }
 *
 * Reads garment details from:
 *   1. project.ai_analysis_json (set by /api/vision/analyze — most detailed)
 *   2. Falls back to project.sub_type + project.fit + project.category defaults
 *
 * Saves outputs to /tmp/fabrica/[id]/:
 *   flatsketch_front.svg + flatsketch_front.png
 *   flatsketch_back.svg  + flatsketch_back.png
 *
 * Response:
 * {
 *   front?: { prompt: string; svg_saved: boolean; png_saved: boolean }
 *   back?:  { prompt: string; svg_saved: boolean; png_saved: boolean }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProjectStatus } from "@/lib/db";
import type { SubType, FitType } from "@/lib/db";
import type { GarmentFeatures, ExpandedAnalysis } from "@/lib/ai/types";
import { writeFile, FILES } from "@/lib/storage";
import { buildFlatSketchPrompt } from "@/lib/recraft/prompts";
import { generateVectorSketch } from "@/lib/recraft/client";

export const runtime = "nodejs";
// Allow up to 120 s for two Recraft API calls + downloads
export const maxDuration = 120;

type View = "front" | "back" | "both";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive garment attributes from the stored AI analysis JSON, with safe fallbacks. */
function resolveAttributes(project: ReturnType<typeof getProject>): {
  subType: SubType;
  fit: FitType;
  features: GarmentFeatures;
} {
  if (!project) throw new Error("Project not found");

  let analysis: ExpandedAnalysis | null = null;
  if (project.ai_analysis_json) {
    try {
      analysis = JSON.parse(project.ai_analysis_json) as ExpandedAnalysis;
    } catch {
      // ignore — fall through to defaults
    }
  }

  const subType: SubType =
    analysis?.sub_type ??
    (project.sub_type as SubType) ??
    (project.category === "sweatpants"
      ? "sweatpants"
      : project.category === "sweatshirt"
      ? "crewneck"
      : "pullover_hoodie");

  const fit: FitType = analysis?.fit ?? (project.fit as FitType) ?? "regular";

  const features: GarmentFeatures = analysis?.features ?? {
    zip:            subType === "zip_hoodie",
    kangarooPocket: ["pullover_hoodie", "zip_hoodie", "unisex_hoodie"].includes(subType),
    drawcord:       subType !== "crewneck" && subType !== "sweatpants",
    ribHem:         true,
    ribCuff:        true,
  };

  return { subType, fit, features };
}

/** Generate one view and persist it. Returns saved-file flags. */
async function generateView(
  projectId: string,
  subType: SubType,
  fit: FitType,
  features: GarmentFeatures,
  view: "front" | "back",
): Promise<{ prompt: string; svg_saved: boolean; png_saved: boolean }> {
  const prompt = buildFlatSketchPrompt(subType, fit, features, view);

  console.log(`[generate-flat] Project ${projectId} — ${view} view`);
  console.log(`[generate-flat] Prompt: ${prompt.slice(0, 120)}…`);

  const { svgBuffer, pngBuffer } = await generateVectorSketch(prompt);

  const svgFile = view === "front" ? FILES.FLAT_SVG_FRONT : FILES.FLAT_SVG_BACK;
  const pngFile = view === "front" ? FILES.FLAT_PNG_FRONT : FILES.FLAT_PNG_BACK;

  writeFile(projectId, svgFile, svgBuffer);
  // Also write to legacy SVG path for front view (keeps existing /svg route working)
  if (view === "front") writeFile(projectId, FILES.SVG, svgBuffer);

  let png_saved = false;
  if (pngBuffer) {
    writeFile(projectId, pngFile, pngBuffer);
    png_saved = true;
  }

  return { prompt, svg_saved: true, png_saved };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!process.env.RECRAFT_API_TOKEN) {
    return NextResponse.json({ error: "RECRAFT_API_TOKEN not configured" }, { status: 500 });
  }

  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: { view?: unknown } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  const viewParam = body.view;
  const view: View =
    viewParam === "front" || viewParam === "back" ? viewParam : "both";

  const { subType, fit, features } = resolveAttributes(project);

  const result: Record<string, { prompt: string; svg_saved: boolean; png_saved: boolean }> = {};

  try {
    if (view === "front" || view === "both") {
      result.front = await generateView(params.id, subType, fit, features, "front");
    }
    if (view === "back" || view === "both") {
      result.back = await generateView(params.id, subType, fit, features, "back");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[generate-flat] Project ${params.id} failed:`, msg);
    return NextResponse.json({ error: `Flat sketch generation failed: ${msg}` }, { status: 502 });
  }

  // Mark project ready if not already
  if (project.status !== "ready") {
    updateProjectStatus(params.id, "ready");
  }

  return NextResponse.json(result);
}
