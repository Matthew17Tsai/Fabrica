/**
 * GET /api/projects/[id]/flat-sketch
 *
 * Returns the generated flat sketch data for a project.
 * Includes SVG content inline + availability flags.
 *
 * Query params:
 *   ?view=front|back    — return only that view (default: both)
 *   ?format=png         — stream the PNG binary instead of JSON
 *   ?download=1         — add Content-Disposition: attachment header
 *
 * Default JSON response:
 * {
 *   front: { svg: string | null; has_png: boolean; source: 'recraft' | 'refined' | null }
 *   back:  { svg: string | null; has_png: boolean; source: 'recraft' | 'refined' | null }
 * }
 *
 * PNG binary response (format=png):
 *   Content-Type: image/png
 *   Raw PNG bytes
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { readFile, fileExists, FILES } from "@/lib/storage";

export const runtime = "nodejs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readSvgOrNull(projectId: string, filename: string): string | null {
  if (!fileExists(projectId, filename)) return null;
  try {
    return readFile(projectId, filename).toString("utf-8");
  } catch {
    return null;
  }
}

type ViewSource = "recraft" | "refined" | null;

function detectSource(projectId: string, svgFile: string): ViewSource {
  if (!fileExists(projectId, svgFile)) return null;
  // "refined" marker: we store a sidecar file when a designer uploads a refined SVG
  const marker = svgFile.replace(".svg", ".refined");
  return fileExists(projectId, marker) ? "refined" : "recraft";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const viewParam  = searchParams.get("view");   // 'front' | 'back'
  const format     = searchParams.get("format"); // 'png'
  const download   = searchParams.get("download") === "1";

  // ── PNG binary mode ────────────────────────────────────────────────────────
  if (format === "png") {
    const view = viewParam === "back" ? "back" : "front";
    const pngFile = view === "front" ? FILES.FLAT_PNG_FRONT : FILES.FLAT_PNG_BACK;

    if (!fileExists(params.id, pngFile)) {
      return NextResponse.json(
        { error: `PNG for ${view} view not available. Run generate-flat first.` },
        { status: 404 },
      );
    }

    const pngBuffer = readFile(params.id, pngFile);
    const headers: Record<string, string> = { "Content-Type": "image/png" };
    if (download) {
      headers["Content-Disposition"] =
        `attachment; filename="flatsketch_${view}.png"`;
    }

    return new NextResponse(new Uint8Array(pngBuffer), { headers });
  }

  // ── JSON mode ──────────────────────────────────────────────────────────────
  const buildViewData = (view: "front" | "back") => {
    const svgFile = view === "front" ? FILES.FLAT_SVG_FRONT : FILES.FLAT_SVG_BACK;
    const pngFile = view === "front" ? FILES.FLAT_PNG_FRONT : FILES.FLAT_PNG_BACK;

    return {
      svg:     readSvgOrNull(params.id, svgFile),
      has_png: fileExists(params.id, pngFile),
      source:  detectSource(params.id, svgFile),
      // Convenience download URLs (relative to the API)
      svg_download_url: `/api/projects/${params.id}/export/svg?view=${view}`,
      png_download_url: `/api/projects/${params.id}/flat-sketch?view=${view}&format=png&download=1`,
    };
  };

  if (viewParam === "front") {
    return NextResponse.json({ front: buildViewData("front") });
  }
  if (viewParam === "back") {
    return NextResponse.json({ back: buildViewData("back") });
  }

  // Both views
  return NextResponse.json({
    front: buildViewData("front"),
    back:  buildViewData("back"),
  });
}
