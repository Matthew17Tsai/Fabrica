import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  getProject,
  updateProjectAnalysis,
  deleteMeasurements,
  upsertMeasurement,
} from "@/lib/db";
import type { SubType, FitType } from "@/lib/db";
import { readFile, fileExists, FILES } from "@/lib/storage";
import { analyzeGarmentExpanded } from "@/lib/ai/expandedAnalysis";
import { type GarmentCategory, VisionParsingError } from "@/lib/ai/types";
import { computeMeasurements } from "@/lib/templates/measurements";

export const runtime = "nodejs";

/**
 * POST /api/vision/analyze
 *
 * Runs the expanded AI analysis on a project's uploaded image, stores the
 * results back into the project record, and optionally pre-fills measurements.
 *
 * Body:
 * {
 *   project_id: string;         // required — project to analyze
 *   prefill_measurements?: boolean; // default true — auto-seed POM after analysis
 * }
 *
 * Response:
 * {
 *   analysis: ExpandedAnalysis;
 *   measurements_prefilled: number; // count of measurement rows seeded (0 if skipped)
 * }
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  let body: { project_id?: unknown; prefill_measurements?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = typeof body.project_id === "string" ? body.project_id.trim() : "";
  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Find the image to analyze — prefer original upload
  let imageBuffer: Buffer;
  let mimeType = "image/png";

  if (fileExists(projectId, FILES.ORIGINAL)) {
    imageBuffer = readFile(projectId, FILES.ORIGINAL);
    // Detect mime type from file header
    const header = imageBuffer.subarray(0, 4);
    if (header[0] === 0xff && header[1] === 0xd8) mimeType = "image/jpeg";
    else if (header[0] === 0x89 && header[1] === 0x50) mimeType = "image/png";
  } else {
    return NextResponse.json(
      { error: "No original image found for this project. Upload an image first." },
      { status: 404 },
    );
  }

  // Run the expanded analysis
  let analysis;
  try {
    analysis = await analyzeGarmentExpanded({
      imageBuffer,
      mimeType,
      categoryHint: project.category as GarmentCategory,
    });
  } catch (err) {
    if (err instanceof VisionParsingError) {
      return NextResponse.json(
        { error: "AI analysis failed to parse garment", detail: err.message },
        { status: 422 },
      );
    }
    console.error("[vision/analyze] Error:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }

  // Persist results to the project record
  updateProjectAnalysis(projectId, {
    sub_type:          analysis.sub_type as SubType,
    fit:               analysis.fit as FitType,
    detected_color:    analysis.color.primary_hex,
    detected_material: analysis.material.primary,
    ai_analysis_json:  JSON.stringify(analysis),
  });

  // Pre-fill measurements (default: true)
  const shouldPrefill = body.prefill_measurements !== false;
  let measurementsPrefilled = 0;

  if (shouldPrefill) {
    const baseSize = project.base_size ?? "M";
    const computed = computeMeasurements(
      project.category,
      baseSize as import("@/lib/db").BaseSize,
      analysis.fit as FitType,
      analysis.sub_type as SubType,
    );

    deleteMeasurements(projectId);

    for (const m of computed) {
      upsertMeasurement({
        id:             nanoid(),
        project_id:     projectId,
        measurement_id: m.measurement_id,
        label:          m.label,
        value_inches:   m.value_inches,
        tolerance:      m.tolerance,
        notes:          m.description,
        sort_order:     m.sort_order,
      });
    }

    measurementsPrefilled = computed.length;
  }

  return NextResponse.json({
    analysis,
    measurements_prefilled: measurementsPrefilled,
  });
}
