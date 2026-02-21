/**
 * POST /api/projects/[id]/generate-sketch
 *
 * Generates AI flat sketches (front + back) for a project using Gemini.
 * Called from the loading page after project creation.
 *
 * Requires GEMINI_API_KEY environment variable.
 * Gracefully returns { skipped: true } if the key is absent.
 *
 * Response:
 * { front: string; back: string }  — asset URLs on success
 * { skipped: true; reason: string } — if Gemini key missing or generation fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { nanoid } from 'nanoid';
import { getProject, createAsset } from '@/lib/db';
import { writeFile, fileExists, FILES, getFilePath, originalFilename } from '@/lib/storage';
import { generateSketchPair, buildGarmentDescription } from '@/lib/gemini-sketch';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const project = getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Skip if no Gemini key
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'GEMINI_API_KEY not configured' });
  }

  // Skip if AI sketches already exist
  if (
    fileExists(params.id, FILES.AI_SKETCH_FRONT) &&
    fileExists(params.id, FILES.AI_SKETCH_BACK)
  ) {
    return NextResponse.json({
      front: `/api/projects/${params.id}/ai-sketch?view=front`,
      back:  `/api/projects/${params.id}/ai-sketch?view=back`,
    });
  }

  // Find the primary photo to pass to Gemini
  const photoPath = getFilePath(params.id, originalFilename(1));
  if (!existsSync(photoPath)) {
    return NextResponse.json({ skipped: true, reason: 'No photo found for project' });
  }

  const description = buildGarmentDescription(project.category, project.ai_analysis_json);

  try {
    // Generate front + back using chat history for visual consistency
    const { front: frontBuffer, back: backBuffer } = await generateSketchPair(photoPath, description);

    writeFile(params.id, FILES.AI_SKETCH_FRONT, frontBuffer);
    writeFile(params.id, FILES.AI_SKETCH_BACK, backBuffer);

    // Record assets in DB (upsert pattern — remove old then insert)
    createAsset({
      id:                nanoid(),
      project_id:        params.id,
      asset_type:        'ai_sketch_front',
      file_path:         FILES.AI_SKETCH_FRONT,
      original_filename: 'ai_sketch_front.png',
      mime_type:         'image/png',
    });
    createAsset({
      id:                nanoid(),
      project_id:        params.id,
      asset_type:        'ai_sketch_back',
      file_path:         FILES.AI_SKETCH_BACK,
      original_filename: 'ai_sketch_back.png',
      mime_type:         'image/png',
    });

    return NextResponse.json({
      front: `/api/projects/${params.id}/ai-sketch?view=front`,
      back:  `/api/projects/${params.id}/ai-sketch?view=back`,
    });
  } catch (err) {
    console.error('Sketch generation failed:', err);
    return NextResponse.json({
      skipped: true,
      reason: err instanceof Error ? err.message : 'Generation failed',
    });
  }
}
