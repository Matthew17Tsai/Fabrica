/**
 * POST /api/projects/[id]/upload-refined-svg
 *
 * Allows a designer to re-upload a flat sketch SVG after refining it in Adobe
 * Illustrator (or any vector editor). The refined file replaces the Recraft-
 * generated flat sketch and is rasterized to a new high-res PNG.
 *
 * Request: multipart/form-data
 *   file  — SVG file (required)
 *   view  — 'front' | 'back' (required)
 *
 * Response:
 * {
 *   view:      'front' | 'back'
 *   svg_saved: true
 *   png_saved: boolean
 *   bytes:     number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getProject } from "@/lib/db";
import { writeFile, fileExists, getFilePath, FILES } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SVG_BYTES = 10 * 1024 * 1024; // 10 MB
const VALID_VIEWS   = new Set(["front", "back"]);

// ── SVG rasterizer ────────────────────────────────────────────────────────────

async function rasterizeSvg(svgBuffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(svgBuffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: false })
      .png({ compressionLevel: 8 })
      .toBuffer();
  } catch (err) {
    console.warn("[upload-refined-svg] PNG rasterization failed:", (err as Error).message);
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const view = formData.get("view") as string | null;
  if (!view || !VALID_VIEWS.has(view)) {
    return NextResponse.json(
      { error: 'view field is required and must be "front" or "back"' },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }

  // Validate SVG type
  const isNameSvg = file.name?.toLowerCase().endsWith(".svg");
  const isMimeSvg = file.type === "image/svg+xml" || file.type === "text/xml";
  if (!isNameSvg && !isMimeSvg) {
    return NextResponse.json(
      { error: "Only SVG files are accepted" },
      { status: 415 },
    );
  }

  if (file.size > MAX_SVG_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_SVG_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const arrayBuf  = await file.arrayBuffer();
  const svgBuffer = Buffer.from(arrayBuf);

  // Basic SVG content check
  const head = svgBuffer.subarray(0, 512).toString("utf-8").toLowerCase();
  if (!head.includes("<svg")) {
    return NextResponse.json(
      { error: "File does not appear to be a valid SVG" },
      { status: 422 },
    );
  }

  // ── Persist files ─────────────────────────────────────────────────────────

  const svgFile = view === "front" ? FILES.FLAT_SVG_FRONT : FILES.FLAT_SVG_BACK;
  const pngFile = view === "front" ? FILES.FLAT_PNG_FRONT : FILES.FLAT_PNG_BACK;

  writeFile(params.id, svgFile, svgBuffer);

  // Also update the legacy SVG path for front view
  if (view === "front") {
    writeFile(params.id, FILES.SVG, svgBuffer);
  }

  // Write a marker file so the flat-sketch GET route can indicate "refined" source
  const markerFile = svgFile.replace(".svg", ".refined");
  writeFile(params.id, markerFile, "1");

  // Rasterize to PNG
  const pngBuffer = await rasterizeSvg(svgBuffer);
  let png_saved = false;
  if (pngBuffer) {
    writeFile(params.id, pngFile, pngBuffer);
    png_saved = true;
  }

  return NextResponse.json({
    view,
    svg_saved: true,
    png_saved,
    bytes: svgBuffer.length,
  });
}
