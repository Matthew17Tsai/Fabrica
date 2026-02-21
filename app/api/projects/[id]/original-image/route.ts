/**
 * GET /api/projects/[id]/original-image
 *
 * Streams the original inspiration photo for display alongside the flat sketch.
 *
 * Query params:
 *   ?index=1   (default 1) — which uploaded photo to serve (1–5)
 *
 * Response:
 *   Content-Type: image/png
 *   Raw image bytes
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { fileExists, readFile, originalFilename } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const indexParam = parseInt(searchParams.get("index") ?? "1", 10);
  const index = isNaN(indexParam) || indexParam < 1 ? 1 : indexParam;

  const filename = originalFilename(index);

  if (!fileExists(params.id, filename)) {
    return NextResponse.json(
      { error: `Original image (index ${index}) not found.` },
      { status: 404 },
    );
  }

  const imageBuffer = readFile(params.id, filename);

  return new NextResponse(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
